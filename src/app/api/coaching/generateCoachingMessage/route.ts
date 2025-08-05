/**
 * AUTOMATED COACHING MESSAGE GENERATION API ROUTE
 * 
 * This endpoint is designed to be called by a Vercel cron job every hour to:
 * 1. Identify users who are due for coaching messages based on their preferences
 * 2. Generate personalized coaching messages using AI
 * 3. Simulate outcomes and improve messages
 * 4. Inject final messages into users' latest journal entries
 * 
 * FEATURES:
 * - Processes all users with coaching messages enabled
 * - Respects user timezone and time preferences (morning/afternoon/evening)
 * - Uses coaching frequency settings (daily/multipleTimesPerWeek/onceAWeek)
 * - Builds comprehensive context including insights, recent entries, and user preferences
 * - Two-stage LLM process: generation + outcome simulation for quality assurance
 * - Injects coaching messages directly into journal entries as HTML paragraphs
 * 
 * CRON SCHEDULE:
 * - Intended to run every hour
 * - Only processes users during their preferred time windows
 * - Updates nextCoachingMessageDue timestamps for efficient querying
 * 
 * AUTHENTICATION:
 * - No authentication required (internal cron job)
 * - Should be protected by Vercel's cron job headers in production
 */

import { NextRequest, NextResponse } from 'next/server';
import OpenAI from 'openai';
import { z } from 'zod';
import { FirestoreAdminService } from '@/services/firestoreAdminService';
import { CoachingContextBuilder } from '@/lib/coaching/contextBuilder';
import { UserAccount } from '@/types/journal';
import { userInsight } from '@/types/insights';
import { readFileSync } from 'fs';
import { join } from 'path';

// Zod schemas for LLM response validation
const MessageGenerationResponseSchema = z.object({
  thinking: z.string(),
  recommendedMessageType: z.enum([
    'check_in', 'encouragement', 'challenge', 'reminder', 
    'alignment_reflection', 'general_reflection', 'personal_insight', 'relevant_lesson'
  ]),
  pushNotificationText: z.string().min(40).max(60),
  fullMessage: z.string().min(50)
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
type OutcomeSimulationResponse = z.infer<typeof OutcomeSimulationResponseSchema>;

/**
 * Main cron job endpoint for automated coaching message generation
 */
export async function POST(request: NextRequest) {
  try {
    console.log('🤖 [COACHING-CRON] Starting automated coaching message generation');
    
    // Verify this is a cron job request in production
    if (process.env.NODE_ENV === 'production') {
      const authHeader = request.headers.get('authorization');
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

    // Get all users with coaching enabled
    const usersWithCoaching = await FirestoreAdminService.getAllUsersWithCoachingEnabled();
    console.log(`🤖 [COACHING-CRON] Found ${usersWithCoaching.length} users with coaching enabled`);

    const results = {
      totalUsers: usersWithCoaching.length,
      processedUsers: 0,
      skippedUsers: 0,
      successfulMessages: 0,
      errors: 0
    };

    // Process each user
    for (const user of usersWithCoaching) {
      try {
        const shouldProcess = await shouldProcessUser(user);
        
        if (!shouldProcess) {
          results.skippedUsers++;
          console.log(`⏭️ [COACHING-CRON] Skipping user ${user.uid} - not due for message`);
          continue;
        }

        console.log(`🎯 [COACHING-CRON] Processing user ${user.uid}`);
        results.processedUsers++;

        const messageResult = await generateAndDeliverCoachingMessage(user);
        
        if (messageResult.success) {
          results.successfulMessages++;
          console.log(`✅ [COACHING-CRON] Successfully delivered message to user ${user.uid}`);
        } else {
          results.errors++;
          console.error(`❌ [COACHING-CRON] Failed to deliver message to user ${user.uid}:`, messageResult.error);
        }

      } catch (error) {
        results.errors++;
        console.error(`❌ [COACHING-CRON] Error processing user ${user.uid}:`, error);
      }
    }

    console.log('🤖 [COACHING-CRON] Batch processing complete:', results);

    return NextResponse.json({
      success: true,
      results
    });

  } catch (error) {
    console.error('❌ [COACHING-CRON] Fatal error in coaching message generation:', error);
    
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    );
  }
}

/**
 * Determine if a user should be processed for coaching message generation
 * based on their preferences, timezone, and last message timestamp
 */
async function shouldProcessUser(user: UserAccount): Promise<boolean> {
  // Check if coaching is enabled
  if (!user.coachingConfig.enableCoachingMessages) {
    return false;
  }

  const now = new Date();
  const userTimezone = user.userTimezone || 'America/New_York';
  
  // Get current time in user's timezone
  const userLocalTime = new Date(now.toLocaleString('en-US', { timeZone: userTimezone }));
  const userHour = userLocalTime.getHours();
  const userDay = userLocalTime.getDay(); // 0 = Sunday, 1 = Monday, etc.

  // Check if we're in the user's preferred time window
  const timePreference = user.coachingConfig.coachingMessageTimePreference;
  const isInTimeWindow = isInPreferredTimeWindow(userHour, timePreference);
  
  if (!isInTimeWindow) {
    return false;
  }

  // Check if enough time has passed based on frequency
  const lastMessageTime = user.coachingConfig.lastCoachingMessageSentAt;
  const frequency = user.coachingConfig.coachingMessageFrequency;
  
  const timeSinceLastMessage = now.getTime() - lastMessageTime;
  const isDue = isUserDueForMessage(timeSinceLastMessage, frequency, userDay);

  return isDue;
}

/**
 * Check if current hour falls within user's preferred time window
 */
function isInPreferredTimeWindow(hour: number, preference: string): boolean {
  switch (preference) {
    case 'morning':
      return hour >= 6 && hour <= 11;
    case 'afternoon':
      return hour >= 12 && hour <= 17;
    case 'evening':
      return hour >= 18 && hour <= 21;
    default:
      return hour >= 6 && hour <= 21; // Default to reasonable hours
  }
}

/**
 * Determine if user is due for a message based on frequency and timing
 */
function isUserDueForMessage(
  timeSinceLastMessage: number, 
  frequency: string, 
  currentDay: number
): boolean {
  const hoursAgo = timeSinceLastMessage / (1000 * 60 * 60);
  const daysAgo = hoursAgo / 24;

  switch (frequency) {
    case 'daily':
      // Send daily, but not more than once per day
      return hoursAgo >= 20; // Allow daily messages with some buffer
      
    case 'multipleTimesPerWeek':
      // Send 2-3 times per week (every 2-3 days)
      return daysAgo >= 2;
      
    case 'onceAWeek':
      // Send once per week
      return daysAgo >= 7;
      
    default:
      return false;
  }
}

/**
 * Generate and deliver a coaching message for a specific user
 */
async function generateAndDeliverCoachingMessage(user: UserAccount): Promise<{
  success: boolean;
  error?: string;
}> {
  try {
    // 1. Build comprehensive user context
    const context = await buildCoachingMessageContext(user.uid);
    
    // 2. Generate initial coaching message
    const initialMessage = await generateCoachingMessage(context);
    
    // 3. Simulate outcome and improve if needed
    const finalMessage = await optimizeCoachingMessage(initialMessage, context);
    
    // 4. Inject message into latest journal entry
    await injectCoachingMessageIntoJournal(user.uid, finalMessage);
    
    // 5. Update user's next due timestamp
    const nextDueTime = calculateNextDueTime(user);
    await FirestoreAdminService.updateUserNextCoachingMessageDue(user.uid, nextDueTime);
    
    return { success: true };
    
  } catch (error) {
    console.error(`Error generating coaching message for user ${user.uid}:`, error);
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
async function generateCoachingMessage(context: string): Promise<MessageGenerationResponse> {
  const openrouter = new OpenAI({
    baseURL: 'https://openrouter.ai/api/v1',
    apiKey: process.env.OPENROUTER_API_KEY,
    defaultHeaders: {
      'X-Title': 'Reflecta Coaching Message Generation',
    },
  });

  const promptPath = join(process.cwd(), 'src/app/api/coaching/generateCoachingMessage/prompts/message-generation.md');
  const systemPrompt = readFileSync(promptPath, 'utf-8');

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

  // Extract JSON from response (assuming it follows the required format)
  const jsonMatch = content.match(/\{[\s\S]*\}/);
  if (!jsonMatch) {
    throw new Error('Invalid response format from message generation LLM');
  }

  try {
    const parsedResponse = JSON.parse(jsonMatch[0]);
    return MessageGenerationResponseSchema.parse(parsedResponse);
  } catch (error) {
    throw new Error(`Failed to parse message generation response: ${error}`);
  }
}

/**
 * Simulate outcome and optimize coaching message
 */
async function optimizeCoachingMessage(
  initialMessage: MessageGenerationResponse, 
  context: string
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

  const response = await openrouter.chat.completions.create({
    model: 'anthropic/claude-3.5-sonnet',
    messages: [
      { role: 'system', content: systemPrompt },
      { role: 'user', content: simulationInput }
    ],
    temperature: 0.3, // Lower temperature for more consistent evaluation
    max_tokens: 800,
  });

  const content = response.choices[0]?.message?.content;
  if (!content) {
    throw new Error('No response from outcome simulation LLM');
  }

  // Extract JSON from response
  const jsonMatch = content.match(/\{[\s\S]*\}/);
  if (!jsonMatch) {
    throw new Error('Invalid response format from outcome simulation LLM');
  }

  try {
    const simulation = JSON.parse(jsonMatch[0]);
    const validatedSimulation = OutcomeSimulationResponseSchema.parse(simulation);

    // If the message needs major revision or should be skipped, throw an error
    if (validatedSimulation.recommendAction === 'SKIP_MESSAGE') {
      throw new Error('Message should be skipped based on outcome simulation');
    }

    // If overall effectiveness is too low, throw an error
    if (validatedSimulation.overallEffectiveness < 6) {
      throw new Error(`Message effectiveness too low: ${validatedSimulation.overallEffectiveness}/10`);
    }

    // For now, return the original message (future: implement improvement logic)
    // TODO: Implement automatic message improvement based on simulation feedback
    return initialMessage;

  } catch (error) {
    throw new Error(`Failed to parse outcome simulation response: ${error}`);
  }
}

/**
 * Inject coaching message into user's latest journal entry
 */
async function injectCoachingMessageIntoJournal(
  userId: string, 
  message: MessageGenerationResponse
): Promise<void> {
  const latestEntry = await FirestoreAdminService.getLatestJournalEntry(userId);
  
  if (!latestEntry) {
    throw new Error('No journal entries found for user');
  }

  // Create coaching message paragraph
  const coachingMessageHtml = `<p><strong>💭 Coaching Reflection:</strong> ${message.fullMessage}</p>`;
  
  // Append to existing content
  const updatedContent = `${latestEntry.content}\n\n${coachingMessageHtml}`;
  
  await FirestoreAdminService.updateJournalEntryContent(latestEntry.id, updatedContent);
}

/**
 * Calculate when the next coaching message should be due
 */
function calculateNextDueTime(user: UserAccount): number {
  const now = new Date();
  const frequency = user.coachingConfig.coachingMessageFrequency;
  const timePreference = user.coachingConfig.coachingMessageTimePreference;
  const timezone = user.userTimezone || 'America/New_York';

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

  const nextTime = new Date(now.getTime() + (hoursToAdd * 60 * 60 * 1000));
  
  // Adjust to preferred time window in user's timezone
  const userLocalTime = new Date(nextTime.toLocaleString('en-US', { timeZone: timezone }));
  
  let targetHour = 9; // Default to 9 AM
  switch (timePreference) {
    case 'morning':
      targetHour = 9;
      break;
    case 'afternoon':
      targetHour = 14;
      break;
    case 'evening':
      targetHour = 19;
      break;
  }

  userLocalTime.setHours(targetHour, 0, 0, 0);
  
  return userLocalTime.getTime();
}