import OpenAI from 'openai';
import { getFirestore } from 'firebase-admin/firestore';
import app from '@/lib/firebase-admin';
import fs from 'fs';
import path from 'path';
import { 
  CoachingMessage, 
  UserContext, 
  EvaluationResult,
  ImpactEvaluation,
  ImpactEvaluationSchema,
  OutcomeSimulation,
  OutcomeSimulationSchema,
  MessageType
} from './types';
import { JournalEntry } from '@/types/journal';

/**
 * Main evaluation function that orchestrates the two-step AI evaluation process
 */
export async function evaluateCoachingMessage(userId: string): Promise<EvaluationResult> {
  if (!process.env.OPENROUTER_API_KEY) {
    throw new Error('OpenRouter API key not configured');
  }

  console.log(`🧠 Evaluating coaching message for user ${userId}`);
  console.log('='.repeat(80));

  // Step 1: Gather user context
  console.log(`📋 STEP 1: Gathering user context...`);
  const context = await gatherUserContext(userId);

  // Step 2: Draft message - determine message type and content
  console.log(`🔍 STEP 2: Drafting message...`);
  const impactEval = await draftMessage(context);
  
  console.log(`✅ Message drafting complete. Recommended: ${impactEval.recommendedMessageType}`);

  // Step 3: Outcome simulation - final quality check and decision
  console.log(`🎭 STEP 3: Running outcome simulation...`);
  const outcomeEval = await simulateMessageOutcome(context, impactEval);
  
  console.log(`✅ Outcome simulation complete. Decision: ${outcomeEval.finalDecision} (Excellence: ${outcomeEval.optimizedMessageAnalysis.messageExcellence}/10)`);

  // Step 4: Create and potentially save message
  console.log(`💾 STEP 4: Processing final decision...`);
  
  if (outcomeEval.finalDecision === "SEND") {
    const message = await createCoachingMessage(userId, outcomeEval, impactEval);
    console.log(`🎉 FINAL RESULT: Message will be sent`);
    console.log('='.repeat(80));
    return { 
      shouldSend: true, 
      message, 
      reasoning: outcomeEval.thinking 
    };
  }
  
  console.log(`❌ FINAL RESULT: No message will be sent`);
  console.log(`📝 Final Reasoning: ${outcomeEval.thinking}`);
  console.log('='.repeat(80));
  
  return { 
    shouldSend: false, 
    reasoning: outcomeEval.thinking 
  };
}

/**
 * Gather all relevant context for the user
 */
async function gatherUserContext(userId: string): Promise<UserContext> {
  console.log(`📋 Gathering context for user ${userId}`);

  const [
    recentMessages,
    alignmentDoc,
    recentJournalEntries
  ] = await Promise.all([
    getRecentCoachingMessages(userId, 10),
    getUserAlignmentDoc(userId),
    getRecentJournalEntries(userId, 20)
  ]);

  const lastMessageSentAt = recentMessages.length > 0 
    ? recentMessages[0].sentAt || null 
    : null;

  console.log(`📊 Context gathered: ${recentMessages.length} messages, ${recentJournalEntries.length} journal entries, alignment doc: ${alignmentDoc ? 'yes' : 'no'}`);
  
  // Log recent messages summary
  if (recentMessages.length > 0) {
    console.log(`📝 Recent Messages Summary:`);
    recentMessages.slice(0, 3).forEach((msg, index) => {
      console.log(`   ${index + 1}. [${msg.messageType}] ${msg.sentAt ? msg.sentAt.toISOString() : 'Not sent'}: "${msg.fullMessage.substring(0, 60)}..."`);
    });
    if (recentMessages.length > 3) {
      console.log(`   ... and ${recentMessages.length - 3} more messages`);
    }
  }
  
  // Log journal entries summary
  if (recentJournalEntries.length > 0) {
    console.log(`📖 Recent Journal Entries Summary:`);
    recentJournalEntries.slice(0, 3).forEach((entry, index) => {
      console.log(`   ${index + 1}. ${entry.timestamp.toISOString()}: "${entry.content.substring(0, 60)}..."`);
    });
    if (recentJournalEntries.length > 3) {
      console.log(`   ... and ${recentJournalEntries.length - 3} more entries`);
    }
  }
  
  // Log alignment doc summary
  if (alignmentDoc?.content) {
    console.log(`🎯 Alignment Doc Summary: "${alignmentDoc.content.substring(0, 100)}..."`);
  }
  
  console.log(''); // Add spacing

  return {
    userId,
    recentMessages,
    alignmentDoc,
    recentJournalEntries,
    lastMessageSentAt
  };
}

/**
 * Step 1: Draft a coaching message based on user context
 */
async function draftMessage(context: UserContext): Promise<ImpactEvaluation> {
  const openrouter = new OpenAI({
    baseURL: 'https://openrouter.ai/api/v1',
    apiKey: process.env.OPENROUTER_API_KEY,
    defaultHeaders: {
      'X-Title': 'Reflecta Coaching Message Drafting',
    },
  });

  const systemPrompt = await loadPrompt('impact-evaluation.md');
  const userPrompt = buildImpactEvaluationPrompt(context);

  const response = await openrouter.chat.completions.create({
    model: 'anthropic/claude-sonnet-4',
    messages: [
      { role: 'system', content: systemPrompt },
      { role: 'user', content: userPrompt }
    ],
    temperature: 0.3,
    max_tokens: 1500,
  });

  const aiResponse = response.choices[0]?.message?.content;
  if (!aiResponse) {
    throw new Error('No response from AI model in message drafting');
  }

  // Extract JSON from the response
  const jsonMatch = aiResponse.match(/```json\s*([\s\S]*?)\s*```/);
  if (!jsonMatch) {
    throw new Error('Could not find JSON in AI response');
  }

  const parsed = JSON.parse(jsonMatch[1]);
  const validated = ImpactEvaluationSchema.parse(parsed);
  
  console.log(`📊 DRAFT MESSAGE - Parsed Results:`);
  console.log(`   Message Type: ${validated.recommendedMessageType}`);
  console.log(`   Thinking: ${validated.thinking}`);
  console.log(`   Push Notification: "${validated.pushNotificationText}"`);
  console.log(`   Full Message: "${validated.fullMessage}"\n`);

  return validated;
}

/**
 * Step 2: Simulate message outcome and make final decision
 */
async function simulateMessageOutcome(
  context: UserContext, 
  impactEval: ImpactEvaluation
): Promise<OutcomeSimulation> {
  const openrouter = new OpenAI({
    baseURL: 'https://openrouter.ai/api/v1',
    apiKey: process.env.OPENROUTER_API_KEY,
    defaultHeaders: {
      'X-Title': 'Reflecta Coaching Message Outcome Simulation',
    },
  });

  const systemPrompt = await loadPrompt('outcome-simulation.md');
  const userPrompt = buildOutcomeSimulationPrompt(context, impactEval);

  const response = await openrouter.chat.completions.create({
    model: 'anthropic/claude-sonnet-4',
    messages: [
      { role: 'system', content: systemPrompt },
      { role: 'user', content: userPrompt }
    ],
    temperature: 0.3,
    max_tokens: 1500,
  });

  const aiResponse = response.choices[0]?.message?.content;
  if (!aiResponse) {
    throw new Error('No response from AI model in outcome simulation');
  }

  // Extract JSON from the response
  const jsonMatch = aiResponse.match(/```json\s*([\s\S]*?)\s*```/);
  if (!jsonMatch) {
    throw new Error('Could not find JSON in AI response');
  }

  const parsed = JSON.parse(jsonMatch[1]);
  const validated = OutcomeSimulationSchema.parse(parsed);
  
  console.log(`🎯 OUTCOME SIMULATION - Parsed Results:`);
  console.log(`   Final Decision: ${validated.finalDecision}`);
  console.log(`   Original Psychological Fit: ${validated.originalMessageAnalysis.psychologicalFit}/10`);
  console.log(`   Original Timing Optimality: ${validated.originalMessageAnalysis.timingOptimality}/10`);
  console.log(`   Primary Risks: ${validated.originalMessageAnalysis.primaryRisks.join(', ') || 'None identified'}`);
  console.log(`   Optimized Message Excellence: ${validated.optimizedMessageAnalysis.messageExcellence}/10`);
  console.log(`   Push Notification Appeal: ${validated.optimizedMessageAnalysis.pushNotificationAppeal}/10`);
  console.log(`   Improvement Achieved: ${validated.optimizedMessageAnalysis.improvementAchieved}`);
  console.log(`   Remaining Risks: ${validated.optimizedMessageAnalysis.remainingRisks.join(', ') || 'None identified'}`);
  console.log(`   Confidence Score: ${validated.confidenceScore}`);
  console.log(`   Strategic Reasoning: ${validated.strategicReasoning}`);
  console.log(`   Optimized Push: "${validated.optimizedPushNotification}"`);
  console.log(`   Optimized Full Message: "${validated.optimizedFullMessage}"\n`);

  return validated;
}

/**
 * Create and save a coaching message to Firestore
 */
async function createCoachingMessage(
  userId: string,
  outcomeEval: OutcomeSimulation,
  impactEval: ImpactEvaluation
): Promise<CoachingMessage> {
  if (!app) {
    throw new Error('Firebase Admin SDK not initialized');
  }
  
  const db = getFirestore(app);
  
  const message: CoachingMessage = {
    id: '', // Will be set by Firestore
    userId,
    messageType: impactEval.recommendedMessageType,
    pushNotificationText: outcomeEval.optimizedPushNotification,
    fullMessage: outcomeEval.optimizedFullMessage,
    generatedAt: new Date(),
    sentAt: new Date(), // Mark as sent immediately for testing
    aiMetadata: {
      confidenceScore: outcomeEval.confidenceScore,
      reasoningSteps: [
        `Impact: ${impactEval.thinking}`,
        `Outcome: ${outcomeEval.thinking}`
      ]
    }
  };

  // Save to Firestore
  const docRef = await db.collection('coachingMessages').add({
    ...message,
    generatedAt: message.generatedAt.getTime(),
    sentAt: message.sentAt?.getTime() || null,
    userEngagement: message.userEngagement || null
  });

  message.id = docRef.id;
  console.log(`💾 Coaching message saved with ID: ${docRef.id}`);

  return message;
}

/**
 * Get recent coaching messages for a user
 */
async function getRecentCoachingMessages(userId: string, limit: number): Promise<CoachingMessage[]> {
  if (!app) {
    throw new Error('Firebase Admin SDK not initialized');
  }
  
  const db = getFirestore(app);
  
  try {
    const snapshot = await db
      .collection('coachingMessages')
      .where('userId', '==', userId)
      .orderBy('generatedAt', 'desc')
      .limit(limit)
      .get();

    return snapshot.docs.map(doc => {
      const data = doc.data();
      return {
        id: doc.id,
        userId: data.userId,
        messageType: data.messageType,
        pushNotificationText: data.pushNotificationText || data.content || '', // backward compatibility
        fullMessage: data.fullMessage || data.content || '', // backward compatibility
        generatedAt: new Date(data.generatedAt),
        sentAt: data.sentAt ? new Date(data.sentAt) : undefined,
        userEngagement: data.userEngagement,
        aiMetadata: data.aiMetadata
      };
    });
  } catch (error) {
    console.error('Error fetching coaching messages:', error);
    return [];
  }
}

/**
 * Get user's alignment document
 */
async function getUserAlignmentDoc(userId: string): Promise<any> {
  if (!app) {
    throw new Error('Firebase Admin SDK not initialized');
  }
  
  const db = getFirestore(app);
  
  try {
    const docRef = db.collection('userAlignmentDocs').doc(userId);
    const docSnap = await docRef.get();
    
    if (docSnap.exists) {
      return docSnap.data();
    }
    
    return null;
  } catch (error) {
    console.error('Error fetching alignment doc:', error);
    return null;
  }
}

/**
 * Get recent journal entries for a user
 */
async function getRecentJournalEntries(userId: string, limit: number): Promise<JournalEntry[]> {
  if (!app) {
    throw new Error('Firebase Admin SDK not initialized');
  }
  
  const db = getFirestore(app);
  
  try {
    const snapshot = await db
      .collection('journal_entries')
      .where('uid', '==', userId)
      .orderBy('timestamp', 'desc')
      .limit(limit)
      .get();

    return snapshot.docs.map(doc => {
      const data = doc.data();
      return {
        id: doc.id,
        timestamp: data.timestamp.toDate(),
        content: data.content,
        uid: data.uid,
        lastUpdated: data.lastUpdated.toDate(),
        images: data.images
      };
    });
  } catch (error) {
    console.error('Error fetching journal entries:', error);
    return [];
  }
}

/**
 * Load a prompt template from the prompts directory
 */
async function loadPrompt(filename: string): Promise<string> {
  try {
    const promptPath = path.join(process.cwd(), 'src/app/api/prototype/coaching-message-evaluator/prompts', filename);
    return fs.readFileSync(promptPath, 'utf-8');
  } catch (error) {
    console.error(`Error loading prompt ${filename}:`, error);
    throw new Error(`Failed to load prompt: ${filename}`);
  }
}

/**
 * Build the user prompt for message drafting
 */
function buildImpactEvaluationPrompt(context: UserContext): string {
  const { recentMessages, alignmentDoc, recentJournalEntries, lastMessageSentAt } = context;

  let prompt = `# User Context for Coaching Message Impact Evaluation

## User ID: ${context.userId}

## Recent Coaching Messages (Last 10):
`;

  if (recentMessages.length === 0) {
    prompt += 'No previous coaching messages sent.\n\n';
  } else {
    prompt += `Last message sent: ${lastMessageSentAt ? lastMessageSentAt.toISOString() : 'Never'}\n\n`;
    recentMessages.forEach((msg, index) => {
      prompt += `${index + 1}. [${msg.messageType}] ${msg.sentAt ? msg.sentAt.toISOString() : 'Not sent'}\n   Push: "${msg.pushNotificationText}"\n   Full: "${msg.fullMessage}"\n\n`;
    });
  }

  prompt += `## Alignment Document:
`;
  if (alignmentDoc?.content) {
    prompt += `${alignmentDoc.content}\n\n`;
  } else {
    prompt += 'No alignment document available.\n\n';
  }

  prompt += `## Recent Journal Entries (Last 20):
`;
  if (recentJournalEntries.length === 0) {
    prompt += 'No recent journal entries.\n\n';
  } else {
    recentJournalEntries.forEach((entry, index) => {
      prompt += `${index + 1}. ${entry.timestamp.toISOString()}\n   "${entry.content.substring(0, 200)}${entry.content.length > 200 ? '...' : ''}"\n\n`;
    });
  }

  prompt += `
Based on this context, draft a coaching message for this user right now. Consider their recent activity, patterns, and current state.`;

  return prompt;
}

/**
 * Build the user prompt for outcome simulation
 */
function buildOutcomeSimulationPrompt(context: UserContext, impactEval: ImpactEvaluation): string {
  return `# Coaching Message Outcome Simulation

## User Context Summary:
- User ID: ${context.userId}
- Recent messages: ${context.recentMessages.length}
- Last message: ${context.lastMessageSentAt ? context.lastMessageSentAt.toISOString() : 'Never'}
- Alignment doc: ${context.alignmentDoc ? 'Available' : 'Not available'}
- Recent journal entries: ${context.recentJournalEntries.length}

## Proposed Message from Draft:
**Type:** ${impactEval.recommendedMessageType}
**Push Notification:** "${impactEval.pushNotificationText}"
**Full Message:** "${impactEval.fullMessage}"

**Thinking:** ${impactEval.thinking}

## Your Task:
Simulate how this specific user would likely respond to this message. Consider their patterns, current state, and the timing. Evaluate the message quality and make the final decision on whether to send it.

Focus on:
1. How would THIS user specifically react?
2. Is the timing appropriate given their recent activity?
3. Are there any risks or potential negative outcomes?
4. How could the message be improved?
5. Should we send it or wait?`;
} 