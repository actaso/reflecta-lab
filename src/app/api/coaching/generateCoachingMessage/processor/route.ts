/**
 * INDIVIDUAL USER COACHING MESSAGE PROCESSOR
 * 
 * This endpoint processes coaching messages for individual users.
 * It's called by the scheduler for each user that needs a message.
 * 
 * FEATURES:
 * - Processes one user at a time
 * - Isolated error handling per user
 * - Better timeout management
 * - Parallel processing capability
 * - Retry-friendly architecture
 */

import { NextRequest, NextResponse } from 'next/server';
import OpenAI from 'openai';
import { z } from 'zod';
import { FirestoreAdminService } from '@/services/firestoreAdminService';
import { pushNotificationService } from '@/services/pushNotificationService';
import { CoachingContextBuilder } from '@/lib/coaching/contextBuilder';
import { UserAccount } from '@/types/journal';
import { CoachingMessage } from '@/types/coachingMessage';
import { userInsight } from '@/types/insights';
import { readFileSync } from 'fs';
import { join } from 'path';
import { Langfuse } from 'langfuse';

// Zod schemas for LLM response validation
const MessageGenerationResponseSchema = z.object({
  thinking: z.string(),
  recommendedMessageType: z.enum([
    'check_in', 'encouragement', 'challenge', 'reminder', 
    'alignment_reflection', 'general_reflection', 'personal_insight', 'relevant_lesson'
  ]),
  pushNotificationText: z.string().min(20).max(120),
  fullMessage: z.string().min(50),
  effectivenessRating: z.number().optional() // Added after optimization
});

const OutcomeSimulationResponseSchema = z.object({
  userReceptionSimulation: z.string(),
  scores: z.object({
    relevance: z.number().min(1).max(10),
    timing: z.number().min(1).max(10),
    tone: z.number().min(1).max(10),
    actionability: z.number().min(1).max(10),
    emotionalImpact: z.number().min(1).max(10),
    engagementLikelihood: z.number().min(1).max(10)
  }),
  overallEffectiveness: z.number().min(1).max(10),
  recommendAction: z.enum(['KEEP_AS_IS', 'MINOR_ADJUSTMENTS', 'MAJOR_REVISION', 'SKIP_MESSAGE']),
  improvements: z.array(z.string()),
  alternativeMessageType: z.string().optional(),
  optimalSendTime: z.string().optional()
});

type MessageGenerationResponse = z.infer<typeof MessageGenerationResponseSchema>;

/**
 * Process coaching message for individual user
 */
export async function POST(request: NextRequest) {
  try {
    // Verify authorization
    if (process.env.NODE_ENV === 'production') {
      const authHeader = request.headers.get('authorization');
      console.log(`authHeader: ${authHeader}`);
      console.log(`process.env.CRON_SECRET: ${process.env.CRON_SECRET}`);
      if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
        return NextResponse.json(
          { success: false, error: 'Unauthorized' },
          { status: 401 }
        );
      }
    }

    // Environment checks
    if (!process.env.OPENROUTER_API_KEY) {
      return NextResponse.json(
        { success: false, error: 'OpenRouter API key not configured' },
        { status: 500 }
      );
    }

    // Parse request body
    const { userId } = await request.json();
    
    if (!userId) {
      return NextResponse.json(
        { success: false, error: 'userId is required' },
        { status: 400 }
      );
    }

    console.log(`🎯 [COACHING-PROCESSOR] Processing user ${userId}`);

    // Process the user
    const result = await generateAndDeliverCoachingMessage(userId);
    
    if (result.success) {
      console.log(`✅ [COACHING-PROCESSOR] Successfully processed user ${userId}`);
      return NextResponse.json({
        success: true,
        userId,
        messageGenerated: true
      });
    } else {
      console.error(`❌ [COACHING-PROCESSOR] Failed to process user ${userId}:`, result.error);
      return NextResponse.json({
        success: false,
        userId,
        error: result.error
      }, { status: 500 });
    }

  } catch (error) {
    console.error('❌ [COACHING-PROCESSOR] Fatal error:', error);
    
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    );
  }
}

/**
 * Generate and deliver a coaching message for a specific user
 */
async function generateAndDeliverCoachingMessage(userId: string): Promise<{
  success: boolean;
  error?: string;
}> {
  let context = '';
  
  try {
    // Get user account to verify they still need processing
    const user = await FirestoreAdminService.getUserAccount(userId);
    if (!user || !user.coachingConfig.enableCoachingMessages) {
      return { 
        success: false, 
        error: 'User not found or coaching disabled'
      };
    }

    console.log(`📝 [COACHING-PROCESSOR] Building context for user ${userId}`);
    
    // 1. Build comprehensive user context
    context = await buildCoachingMessageContext(userId);
    
    console.log(`🤖 [COACHING-PROCESSOR] Generating message for user ${userId}`);
    
    // 2. Generate initial coaching message
    const initialMessage = await generateCoachingMessage(context, userId);
    console.log(`✅ [COACHING-PROCESSOR] Generated ${initialMessage.recommendedMessageType} message for user ${userId}`);
    
    console.log(`🧠 [COACHING-PROCESSOR] Optimizing message for user ${userId}`);
    
    // 3. Simulate outcome and improve if needed
    const finalMessage = await optimizeCoachingMessage(initialMessage, context, userId);
    
    // 4. Save coaching message to collection (before sending)
    const coachingMessageData: Omit<CoachingMessage, 'id' | 'createdAt' | 'updatedAt'> = {
      uid: userId,
      messageContent: finalMessage.fullMessage,
      messageType: finalMessage.recommendedMessageType,
      pushNotificationText: finalMessage.pushNotificationText,
      effectivenessRating: finalMessage.effectivenessRating || 0,
      recommendedAction: 'SEND_MESSAGE',
      wasSent: false,
      contextUsed: context,
      generationAttempt: 1,
      userTimezone: user.userTimezone,
      userTimePreference: user.coachingConfig.coachingMessageTimePreference,
      scheduledFor: user.nextCoachingMessageDue
    };
    
    console.log(`💾 [COACHING-PROCESSOR] Saving coaching message record for user ${userId}`);
    const coachingMessageId = await FirestoreAdminService.saveCoachingMessage(coachingMessageData);
    
    console.log(`💬 [COACHING-PROCESSOR] Creating coaching journal entry for user ${userId}`);
    
    // 5. Create new journal entry with coaching message (with bidirectional linking)
    const journalEntryId = await createCoachingJournalEntry(userId, finalMessage, coachingMessageId);
    
    // 6. Update coaching message record with journal entry ID
    await FirestoreAdminService.updateCoachingMessageJournalEntry(coachingMessageId, journalEntryId);
    
    // 7. Send push notification to user
    console.log(`📲 [COACHING-PROCESSOR] Sending push notification to user ${userId}`);
    try {
      const pushResult = await pushNotificationService.sendCoachingMessageNotification(
        userId,
        finalMessage.pushNotificationText,
        finalMessage.recommendedMessageType,
        coachingMessageId,
        journalEntryId
      );
      
      if (pushResult.success) {
        console.log(`✅ [COACHING-PROCESSOR] Push notification sent successfully to user ${userId} (${pushResult.sentCount} devices)`);
      } else {
        console.warn(`⚠️ [COACHING-PROCESSOR] Failed to send push notification to user ${userId}:`, pushResult.errors);
      }
    } catch (pushError) {
      // Don't fail the entire process if push notification fails
      console.error(`❌ [COACHING-PROCESSOR] Push notification error for user ${userId}:`, pushError);
    }
    
    // 8. Update user's next due timestamp (message was sent successfully)
    const nextDueTime = calculateNextCoachingMessageDue(user);
    await FirestoreAdminService.updateUserNextCoachingMessageDue(userId, nextDueTime);
    
    console.log(`🎉 [COACHING-PROCESSOR] Completed processing for user ${userId}`);
    console.log(`📅 [COACHING-PROCESSOR] Next message due: ${new Date(nextDueTime).toLocaleString()}`);
    
    return { success: true };
    
  } catch (error) {
    console.error(`❌ [COACHING-PROCESSOR] Error processing user ${userId}:`, error);
    
    // Save failed coaching message attempt for analytics
    try {
      const user = await FirestoreAdminService.getUserAccount(userId);
      if (user) {
        const failedMessageData: Omit<CoachingMessage, 'id' | 'createdAt' | 'updatedAt'> = {
          uid: userId,
          messageContent: '',
          messageType: 'unknown',
          pushNotificationText: '',
          effectivenessRating: 0,
          recommendedAction: 'SKIP_MESSAGE',
          wasSent: false,
          contextUsed: context || 'Failed to generate context',
          generationAttempt: 1,
          failureReason: error instanceof Error ? error.message : 'Unknown error',
          userTimezone: user.userTimezone,
          userTimePreference: user.coachingConfig.coachingMessageTimePreference,
          scheduledFor: user.nextCoachingMessageDue
        };
        
        await FirestoreAdminService.saveCoachingMessage(failedMessageData);
        console.log(`💾 [COACHING-PROCESSOR] Saved failed coaching message record for user ${userId}`);
      }
    } catch (saveError) {
      console.error(`❌ [COACHING-PROCESSOR] Failed to save failed message record for user ${userId}:`, saveError);
    }
    
    // Even if processing failed, schedule next attempt
    try {
      const user = await FirestoreAdminService.getUserAccount(userId);
      if (user) {
        // Schedule retry sooner than normal (1-4 hours depending on frequency)
        const retryDueTime = calculateRetryCoachingMessageDue(user);
        await FirestoreAdminService.updateUserNextCoachingMessageDue(userId, retryDueTime);
        console.log(`⏰ [COACHING-PROCESSOR] Scheduled retry for user ${userId}: ${new Date(retryDueTime).toLocaleString()}`);
      }
    } catch (scheduleError) {
      console.error(`❌ [COACHING-PROCESSOR] Failed to schedule retry for user ${userId}:`, scheduleError);
    }
    
    return { 
      success: false, 
      error: error instanceof Error ? error.message : 'Unknown error'
    };
  }
}

/**
 * Build comprehensive context for coaching message generation
 */
async function buildCoachingMessageContext(userId: string): Promise<string> {
  const [contextData, insights] = await Promise.all([
    CoachingContextBuilder.buildChatContext(userId),
    FirestoreAdminService.getUserInsights(userId)
  ]);

  let context = contextData.formattedContext;

  // Add insights if available
  if (insights) {
    context += formatInsightsForContext(insights);
  }

  // Add current date/time context
  const now = new Date();
  context += `\n\n=== CURRENT CONTEXT ===\n`;
  context += `Current Date & Time: ${now.toLocaleDateString('en-US', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
    hour12: true
  })}\n`;

  return context;
}

/**
 * Format user insights for coaching context
 */
function formatInsightsForContext(insights: userInsight): string {
  let insightsContext = '\n\n=== USER INSIGHTS ===\n';
  
  if (insights.mainFocus) {
    insightsContext += `Main Focus: ${insights.mainFocus.headline}\n`;
    insightsContext += `Description: ${insights.mainFocus.description}\n`;
  }
  
  if (insights.keyBlockers) {
    insightsContext += `Key Blockers: ${insights.keyBlockers.headline}\n`;
    insightsContext += `Description: ${insights.keyBlockers.description}\n`;
  }
  
  if (insights.plan) {
    insightsContext += `Current Plan: ${insights.plan.headline}\n`;
    insightsContext += `Description: ${insights.plan.description}\n`;
  }
  
  return insightsContext;
}

/**
 * Generate initial coaching message using LLM
 */
async function generateCoachingMessage(context: string, userId: string): Promise<MessageGenerationResponse> {
  const openrouter = new OpenAI({
    baseURL: 'https://openrouter.ai/api/v1',
    apiKey: process.env.OPENROUTER_API_KEY,
    defaultHeaders: {
      'X-Title': 'Reflecta Coaching Message Generation',
    },
  });

  const promptPath = join(process.cwd(), 'src/app/api/coaching/generateCoachingMessage/prompts/message-generation.md');
  const systemPrompt = readFileSync(promptPath, 'utf-8');

  const langfuse = new Langfuse();
  const trace = langfuse?.trace({
    name: 'coaching-message-generation',
    userId,
    metadata: { route: '/api/coaching/generateCoachingMessage/processor' },
  });
  const generation = trace?.generation({
    name: 'message-generation',
    model: 'anthropic/claude-3.5-sonnet',
    input: [
      { role: 'system', content: systemPrompt },
      { role: 'user', content: context }
    ],
    metadata: { provider: 'openrouter' },
  });

  const response = await openrouter.chat.completions.create({
    model: 'anthropic/claude-3.5-sonnet',
    messages: [
      { role: 'system', content: systemPrompt },
      { role: 'user', content: context }
    ],
    temperature: 0.7,
    max_tokens: 1000,
  });

  const content = response.choices[0]?.message?.content;
  if (!content) {
    throw new Error('No response from message generation LLM');
  }

  // Extract JSON from response
  const jsonMatch = content.match(/\{[\s\S]*\}/);
  if (!jsonMatch) {
    console.error('❌ [COACHING-PROCESSOR] No JSON found in LLM response. Full content:', content);
    throw new Error('Invalid response format from message generation LLM - no JSON found');
  }

  const rawJson = jsonMatch[0];
  console.log('🔍 [COACHING-PROCESSOR] Raw JSON extracted:', rawJson.substring(0, 200) + '...');

  try {
    // Clean up common JSON issues from LLM responses
    const cleanedJson = rawJson
      .replace(/[\u0000-\u001f\u007f-\u009f]/g, '') // Remove control characters
      .replace(/\n/g, '\\n') // Escape newlines
      .replace(/\r/g, '\\r') // Escape carriage returns
      .replace(/\t/g, '\\t') // Escape tabs
      .replace(/\\/g, '\\\\') // Escape backslashes (but not already escaped ones)
      .replace(/\\\\n/g, '\\n') // Fix double-escaped newlines
      .replace(/\\\\r/g, '\\r') // Fix double-escaped carriage returns
      .replace(/\\\\t/g, '\\t'); // Fix double-escaped tabs

    console.log('🧹 [COACHING-PROCESSOR] Cleaned JSON:', cleanedJson.substring(0, 200) + '...');

    const parsedResponse = JSON.parse(cleanedJson);
    const validated = MessageGenerationResponseSchema.parse(parsedResponse);
    generation?.end({ output: validated });
    trace?.update({
      input: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: context }
      ],
      output: validated,
    });
    await langfuse.flushAsync();
    return validated;
  } catch (error) {
    console.error('❌ [COACHING-PROCESSOR] JSON Parse Error Details:');
    console.error('  Original JSON (first 500 chars):', rawJson.substring(0, 500));
    console.error('  Error:', error);
    console.error('  Error position:', error instanceof SyntaxError ? (error as SyntaxError & { position?: number }).position : 'unknown');
    
    if (error instanceof SyntaxError) {
      const position = (error as SyntaxError & { position?: number }).position || 0;
      const around = rawJson.substring(Math.max(0, position - 50), position + 50);
      console.error('  Context around error:', around);
    }
    
    throw new Error(`Failed to parse message generation response: ${error}. Check logs for details.`);
  }
}

/**
 * Simulate outcome and optimize coaching message
 */
async function optimizeCoachingMessage(
  initialMessage: MessageGenerationResponse, 
  context: string,
  userId: string
): Promise<MessageGenerationResponse> {
  const openrouter = new OpenAI({
    baseURL: 'https://openrouter.ai/api/v1',
    apiKey: process.env.OPENROUTER_API_KEY,
    defaultHeaders: {
      'X-Title': 'Reflecta Coaching Message Optimization',
    },
  });

  const promptPath = join(process.cwd(), 'src/app/api/coaching/generateCoachingMessage/prompts/outcome-simulation.md');
  const systemPrompt = readFileSync(promptPath, 'utf-8');

  const simulationInput = `
USER CONTEXT:
${context}

PROPOSED COACHING MESSAGE:
Type: ${initialMessage.recommendedMessageType}
Push Notification: ${initialMessage.pushNotificationText}
Full Message: ${initialMessage.fullMessage}
  `;

  const langfuse = new Langfuse();
  const trace = langfuse?.trace({
    name: 'coaching-message-optimization',
    userId,
    metadata: { route: '/api/coaching/generateCoachingMessage/processor' },
  });
  const generation = trace?.generation({
    name: 'message-optimization',
    model: 'anthropic/claude-3.5-sonnet',
    input: [
      { role: 'system', content: systemPrompt },
      { role: 'user', content: simulationInput }
    ],
    metadata: { provider: 'openrouter' },
  });

  const response = await openrouter.chat.completions.create({
    model: 'anthropic/claude-3.5-sonnet',
    messages: [
      { role: 'system', content: systemPrompt },
      { role: 'user', content: simulationInput }
    ],
    temperature: 0.3,
    max_tokens: 800,
  });

  const content = response.choices[0]?.message?.content;
  if (!content) {
    throw new Error('No response from outcome simulation LLM');
  }

  // Extract JSON from response
  const jsonMatch = content.match(/\{[\s\S]*\}/);
  if (!jsonMatch) {
    console.error('❌ [COACHING-PROCESSOR] No JSON found in optimization LLM response. Full content:', content);
    throw new Error('Invalid response format from outcome simulation LLM - no JSON found');
  }

  const rawJson = jsonMatch[0];
  console.log('🔍 [COACHING-PROCESSOR] Raw optimization JSON extracted:', rawJson.substring(0, 200) + '...');

  try {
    // Clean up common JSON issues from LLM responses
    const cleanedJson = rawJson
      .replace(/[\u0000-\u001f\u007f-\u009f]/g, '') // Remove control characters
      .replace(/\n/g, '\\n') // Escape newlines
      .replace(/\r/g, '\\r') // Escape carriage returns
      .replace(/\t/g, '\\t') // Escape tabs
      .replace(/\\/g, '\\\\') // Escape backslashes (but not already escaped ones)
      .replace(/\\\\n/g, '\\n') // Fix double-escaped newlines
      .replace(/\\\\r/g, '\\r') // Fix double-escaped carriage returns
      .replace(/\\\\t/g, '\\t'); // Fix double-escaped tabs

    console.log('🧹 [COACHING-PROCESSOR] Cleaned optimization JSON:', cleanedJson.substring(0, 200) + '...');

    const simulation = JSON.parse(cleanedJson);
    const validatedSimulation = OutcomeSimulationResponseSchema.parse(simulation);

    // If the message should be skipped, throw an error
    if (validatedSimulation.recommendAction === 'SKIP_MESSAGE') {
      throw new Error('Message should be skipped based on outcome simulation');
    }

    // If overall effectiveness is too low, throw an error
    if (validatedSimulation.overallEffectiveness < 6) {
      throw new Error(`Message effectiveness too low: ${validatedSimulation.overallEffectiveness}/10`);
    }

    console.log(`✅ [COACHING-PROCESSOR] Message optimization complete. Effectiveness: ${validatedSimulation.overallEffectiveness}/10, Action: ${validatedSimulation.recommendAction}`);

    // Return the original message with effectiveness rating attached
    const optimized = {
      ...initialMessage,
      effectivenessRating: validatedSimulation.overallEffectiveness
    } as MessageGenerationResponse;

    generation?.end({ output: optimized });
    trace?.update({
      input: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: simulationInput }
      ],
      output: optimized,
    });
    await langfuse.flushAsync();

    return optimized;

  } catch (error) {
    console.error('❌ [COACHING-PROCESSOR] Optimization JSON Parse Error Details:');
    console.error('  Original JSON (first 500 chars):', rawJson.substring(0, 500));
    console.error('  Error:', error);
    console.error('  Error position:', error instanceof SyntaxError ? (error as SyntaxError & { position?: number }).position : 'unknown');
    
    if (error instanceof SyntaxError) {
      const position = (error as SyntaxError & { position?: number }).position || 0;
      const around = rawJson.substring(Math.max(0, position - 50), position + 50);
      console.error('  Context around error:', around);
    }
    
    throw new Error(`Failed to parse outcome simulation response: ${error}. Check logs for details.`);
  }
}

/**
 * Create a new journal entry with the coaching message
 */
async function createCoachingJournalEntry(
  userId: string, 
  message: MessageGenerationResponse,
  coachingMessageId: string
): Promise<string> {
  // Create journal entry with empty content - coaching message is displayed in separate card
  const entryId = await FirestoreAdminService.createJournalEntryWithCoachingMessage(
    userId, 
    '', // Empty content since coaching message is shown in dedicated card
    coachingMessageId
  );
  
  if (process.env.NODE_ENV === 'development') {
    console.log(`✅ [COACHING-PROCESSOR] Created coaching journal entry ${entryId} linked to message ${coachingMessageId}`);
  }
  return entryId;
}

/**
 * Calculate the next coaching message due time after successful message delivery
 * @param user - User account with coaching preferences
 * @param justSentMessage - Whether a message was just sent (affects timing)
 */
function calculateNextCoachingMessageDue(user: UserAccount, /* _justSentMessage: boolean */): number {
  const now = new Date();
  const userTimezone = user.userTimezone || 'America/New_York';
  const frequency = user.coachingConfig.coachingMessageFrequency;
  const timePreference = user.coachingConfig.coachingMessageTimePreference;

  // Calculate hours to add based on frequency
  let hoursToAdd = 0;
  switch (frequency) {
    case 'daily':
      hoursToAdd = 24;
      break;
    case 'multipleTimesPerWeek':
      hoursToAdd = 48; // 2 days
      break;
    case 'onceAWeek':
      hoursToAdd = 168; // 7 days
      break;
  }

  // Calculate next time
  const nextTime = new Date(now.getTime() + (hoursToAdd * 60 * 60 * 1000));
  
  // Convert to user's timezone and adjust to preferred time window
  const userLocalTime = new Date(nextTime.toLocaleString('en-US', { timeZone: userTimezone }));
  
  let targetHour = 9; // Default to 9 AM
  switch (timePreference) {
    case 'morning':
      targetHour = 8; // 8 AM
      break;
    case 'afternoon':
      targetHour = 14; // 2 PM
      break;
    case 'evening':
      targetHour = 19; // 7 PM
      break;
  }

  // Set to the preferred hour
  userLocalTime.setHours(targetHour, 0, 0, 0);
  
  // If the calculated time is in the past, move to next day
  if (userLocalTime.getTime() <= now.getTime()) {
    userLocalTime.setDate(userLocalTime.getDate() + 1);
  }
  
  return userLocalTime.getTime();
}

/**
 * Calculate retry time for failed message attempts (shorter interval)
 */
function calculateRetryCoachingMessageDue(user: UserAccount): number {
  const now = new Date();
  const userTimezone = user.userTimezone || 'America/New_York';
  const frequency = user.coachingConfig.coachingMessageFrequency;
  const timePreference = user.coachingConfig.coachingMessageTimePreference;

  // Retry sooner than normal frequency
  let hoursToAdd = 0;
  switch (frequency) {
    case 'daily':
      hoursToAdd = 2; // 2 hours
      break;
    case 'multipleTimesPerWeek':
      hoursToAdd = 4; // 4 hours
      break;
    case 'onceAWeek':
      hoursToAdd = 8; // 8 hours
      break;
  }

  // Calculate retry time
  const retryTime = new Date(now.getTime() + (hoursToAdd * 60 * 60 * 1000));
  
  // Convert to user's timezone and adjust to preferred time window
  const userLocalTime = new Date(retryTime.toLocaleString('en-US', { timeZone: userTimezone }));
  
  let targetHour = 9; // Default to 9 AM
  switch (timePreference) {
    case 'morning':
      targetHour = 8; // 8 AM
      break;
    case 'afternoon':
      targetHour = 14; // 2 PM
      break;
    case 'evening':
      targetHour = 19; // 7 PM
      break;
  }

  // Set to the preferred hour
  userLocalTime.setHours(targetHour, 0, 0, 0);
  
  // If the calculated time is in the past, move to next occurrence
  if (userLocalTime.getTime() <= now.getTime()) {
    // Find next occurrence of the preferred time window
    if (timePreference === 'morning') {
      // Next morning
      userLocalTime.setDate(userLocalTime.getDate() + 1);
    } else if (timePreference === 'afternoon' && now.getHours() < 14) {
      // Later today if it's still morning
      // userLocalTime is already set correctly
    } else if (timePreference === 'evening' && now.getHours() < 19) {
      // Later today if it's before evening
      // userLocalTime is already set correctly  
    } else {
      // Move to next day
      userLocalTime.setDate(userLocalTime.getDate() + 1);
    }
  }
  
  return userLocalTime.getTime();
}