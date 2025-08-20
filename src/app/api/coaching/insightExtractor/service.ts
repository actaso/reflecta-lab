/**
 * INSIGHT EXTRACTION SERVICE
 * 
 * Shared service functions for extracting insights from coaching sessions.
 * Used by both the API route and internal trigger functions.
 */

import OpenAI from 'openai';
import { z } from 'zod';
import FirestoreAdminService from '@/lib/firestore-admin';
import { CoachingContextBuilder } from '@/lib/coaching/contextBuilder';
import { CoachingPromptLoader } from '@/app/api/coaching/utils/promptLoader';
import { CoachingSession } from '@/types/coachingSession';
import { userInsight } from '@/types/insights';

/**
 * Zod schema for parsing LLM response (without timestamps)
 */
const LLMInsightSourceSchema = z.object({
  quote: z.string().min(1, "Quote cannot be empty")
});

const LLMInsightSectionSchema = z.object({
  headline: z.string().min(1, "Headlines cannot be empty").max(100, "Headlines cannot exceed 100 characters"),
  description: z.string().min(10, "Description must be at least 10 characters"),
  sources: z.array(LLMInsightSourceSchema).min(1, "At least one source is required")
});

const LLMInsightResponseSchema = z.object({
  mainFocus: LLMInsightSectionSchema,
  keyBlockers: LLMInsightSectionSchema,  
  plan: LLMInsightSectionSchema
});



/**
 * Extract insights for a coaching session by sessionId
 * This is the core service function used by both API routes and internal calls
 */
export async function extractInsightsForSession(sessionId: string, userId: string | null): Promise<{
  success: boolean;
  insights?: Omit<userInsight, 'userId' | 'createdAt' | 'updatedAt'>;
  error?: string;
}> {
  try {
    // Environment checks
    if (!process.env.OPENROUTER_API_KEY) {
      return { success: false, error: 'OpenRouter API key not configured' };
    }

    // Load coaching session from Firestore. If userId is provided, enforce ownership; otherwise skip (admin flow)
    const session = await loadCoachingSession(sessionId, userId ?? undefined);
    if (!session) {
      return { success: false, error: 'Session not found or unauthorized' };
    }

    const effectiveUserId = userId ?? session.userId;

    // Build user context for better insight extraction
    const contextData = await CoachingContextBuilder.buildChatContext(effectiveUserId);

    // Generate insights using LLM
    const extractedInsights = await extractInsightsFromSession(session, contextData.formattedContext);

    // Update user insights in Firestore
    await updateUserInsights(effectiveUserId, extractedInsights);

    console.log(`✅ Successfully extracted insights for session: ${sessionId}`);

    return {
      success: true,
      insights: extractedInsights
    };

  } catch (error) {
    console.error('Insight extraction service error:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error occurred'
    };
  }
}

/**
 * Load coaching session from Firestore and verify user ownership
 */
async function loadCoachingSession(sessionId: string, userId?: string): Promise<CoachingSession | null> {
  try {
    const db = FirestoreAdminService.getAdminDatabase();
    const sessionRef = db.collection('coachingSessions').doc(sessionId);
    const sessionDoc = await sessionRef.get();

    if (!sessionDoc.exists) {
      return null;
    }

    const sessionData = sessionDoc.data() as {
      id: string;
      userId: string;
      sessionType: 'default-session' | 'initial-life-deep-dive';
      messages: Array<{
        id: string;
        role: 'user' | 'assistant';
        content: string;
        timestamp: unknown;
      }>;
      createdAt: unknown;
      updatedAt: unknown;
      duration: number;
      wordCount: number;
    };

    // Verify user ownership if provided
    if (userId && sessionData.userId !== userId) {
      return null;
    }

    // Convert Firestore timestamps to Date objects
    const formattedSession: CoachingSession = {
      id: sessionData.id,
      userId: sessionData.userId,
      sessionType: sessionData.sessionType,
      messages: sessionData.messages.map((msg) => ({
        id: msg.id,
        role: msg.role,
        content: msg.content,
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        timestamp: (msg.timestamp as any)?.toDate ? (msg.timestamp as any).toDate() : new Date(msg.timestamp as any)
      })),
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      createdAt: (sessionData.createdAt as any)?.toDate ? (sessionData.createdAt as any).toDate() : new Date(sessionData.createdAt as any),
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      updatedAt: (sessionData.updatedAt as any)?.toDate ? (sessionData.updatedAt as any).toDate() : new Date(sessionData.updatedAt as any),
      duration: sessionData.duration,
      wordCount: sessionData.wordCount
    };

    return formattedSession;
  } catch (error) {
    console.error('Error loading coaching session:', error);
    throw new Error('Failed to load coaching session');
  }
}

/**
 * Extract insights from coaching session using LLM
 */
async function extractInsightsFromSession(session: CoachingSession, userContext: string): Promise<Omit<userInsight, 'userId' | 'createdAt' | 'updatedAt'>> {
  // Initialize OpenRouter client
  const openrouter = new OpenAI({
    baseURL: 'https://openrouter.ai/api/v1',
    apiKey: process.env.OPENROUTER_API_KEY,
    defaultHeaders: {
      'X-Title': 'Reflecta Insight Extraction',
    },
  });

  // Build conversation content for analysis
  const conversationContent = session.messages
    .map(msg => `${msg.role.toUpperCase()}: ${msg.content}`)
    .join('\n\n');

  // Load the insight extraction prompt
  const basePrompt = CoachingPromptLoader.getInsightExtractionPrompt();
  
  // Build the complete system prompt
  const systemPrompt = basePrompt + `\n\n## User Context\n${userContext}\n\n## Coaching Conversation to Analyze\n${conversationContent}`;

  // Helper to parse JSON from potentially noisy model output
  const tryParseJson = (raw: string): unknown => {
    // Strategy 1: direct parse
    try {
      return JSON.parse(raw);
    } catch {
      // continue
    }

    // Strategy 2: fenced code block ```json ... ```
    const codeFenceMatch = raw.match(/```(?:json)?\n([\s\S]*?)\n```/i) || raw.match(/```(?:json)?([\s\S]*?)```/i);
    if (codeFenceMatch && codeFenceMatch[1]) {
      const fenced = codeFenceMatch[1].trim();
      try {
        return JSON.parse(fenced);
      } catch {
        // continue
      }
    }

    // Strategy 3: extract substring from first '{' to last '}'
    const firstBrace = raw.indexOf('{');
    const lastBrace = raw.lastIndexOf('}');
    if (firstBrace !== -1 && lastBrace !== -1 && lastBrace > firstBrace) {
      const sliced = raw.slice(firstBrace, lastBrace + 1);
      try {
        return JSON.parse(sliced);
      } catch {
        // continue
      }
    }

    // Give up
    throw new Error('Unparsable JSON content');
  };

  // Helper to request model output with optional stricter instruction (used for retry)
  const requestModelContent = async (strictJsonOnly: boolean): Promise<string> => {
    const strictSuffix = strictJsonOnly
      ? '\n\nCRITICAL: Return ONLY a single valid JSON object that strictly matches the schema. Do NOT include any prose, explanations, comments, or markdown code fences.'
      : '';

    const response = await openrouter.chat.completions.create({
      model: 'anthropic/claude-3.5-sonnet',
      messages: [
        { role: 'system', content: systemPrompt + strictSuffix }
      ],
      temperature: 0.3,
      max_tokens: 2000,
    });

    const content = response.choices[0]?.message?.content;
    if (!content) {
      throw new Error('No content received from LLM');
    }
    return content;
  };

  try {
    // Attempt 1
    const content1 = await requestModelContent(false);
    let parsedJson: unknown;
    try {
      parsedJson = tryParseJson(content1);
    } catch (parseError) {
      // Log full raw output to help diagnose prompt/schema issues
      // Limit log size to avoid excessively large logs
      const preview = content1.length > 20000 ? content1.slice(0, 20000) + `\n... [truncated ${content1.length - 20000} chars]` : content1;
      console.error('Failed to parse LLM response as JSON (attempt 1):', parseError);
      console.error('Raw LLM response (attempt 1):\n', preview);

      // Retry once with stricter instruction
      const content2 = await requestModelContent(true);
      try {
        parsedJson = tryParseJson(content2);
      } catch (parseError2) {
        const preview2 = content2.length > 20000 ? content2.slice(0, 20000) + `\n... [truncated ${content2.length - 20000} chars]` : content2;
        console.error('Failed to parse LLM response as JSON (attempt 2):', parseError2);
        console.error('Raw LLM response (attempt 2):\n', preview2);
        throw new Error('Invalid JSON response from LLM');
      }
    }

    // Validate structure with Zod
    const validationResult = LLMInsightResponseSchema.safeParse(parsedJson as unknown);
    if (!validationResult.success) {
      console.error('LLM response validation failed:', validationResult.error.format());
      try {
        console.error('Actual LLM response that failed validation:', JSON.stringify(parsedJson, null, 2));
      } catch {
        console.error('Actual LLM response that failed validation: [unserializable object]');
      }
      
      // Extract specific headline length errors for better debugging
      const headlineErrors = validationResult.error.issues.filter(issue => 
        issue.path.includes('headline') && issue.code === 'too_big'
      );
      
      if (headlineErrors.length > 0) {
        headlineErrors.forEach(error => {
          const fieldPath = error.path.join('.');
          console.error(`Headline too long at ${fieldPath} (max 55 chars)`);
        });
      }
      
      throw new Error(`Invalid insights structure: ${validationResult.error.message}`);
    }

    const llmResponse = validationResult.data;
    
    // Add timestamps to all sources and sections server-side
    const now = Date.now();
    
    // Helper function to safely truncate headlines if they're still too long
    const truncateHeadline = (headline: string, maxLength: number = 55): string => {
      if (headline.length <= maxLength) return headline;
      
      // Try to truncate at word boundary
      const truncated = headline.substring(0, maxLength - 3);
      const lastSpace = truncated.lastIndexOf(' ');
      const result = lastSpace > maxLength * 0.6 
        ? truncated.substring(0, lastSpace) + '...'
        : truncated + '...';
      
      console.warn(`Truncated headline: "${headline}" -> "${result}"`);
      return result;
    };
    
    const insightsWithTimestamps: Omit<userInsight, 'userId' | 'createdAt' | 'updatedAt'> = {
      mainFocus: {
        ...llmResponse.mainFocus,
        headline: truncateHeadline(llmResponse.mainFocus.headline),
        sources: llmResponse.mainFocus.sources.map(source => ({
          ...source,
          extractedAt: now
        })),
        updatedAt: now
      },
      keyBlockers: {
        ...llmResponse.keyBlockers,
        headline: truncateHeadline(llmResponse.keyBlockers.headline),
        sources: llmResponse.keyBlockers.sources.map(source => ({
          ...source,
          extractedAt: now
        })),
        updatedAt: now
      },
      plan: {
        ...llmResponse.plan,
        headline: truncateHeadline(llmResponse.plan.headline),
        sources: llmResponse.plan.sources.map(source => ({
          ...source,
          extractedAt: now
        })),
        updatedAt: now
      }
    };

    return insightsWithTimestamps;
  } catch (error) {
    console.error('Error extracting insights with LLM:', error);
    throw new Error('Failed to extract insights from session');
  }
}

/**
 * Update user insights document in Firestore
 */
async function updateUserInsights(userId: string, insights: Omit<userInsight, 'userId' | 'createdAt' | 'updatedAt'>): Promise<void> {
  try {
    const db = FirestoreAdminService.getAdminDatabase();
    const now = Date.now();
    
    // For now, we use userId as document ID (1 user = 1 userInsight)
    // In the future, we could add support for multiple insights per user
    const insightRef = db.collection('userInsights').doc(userId);
    
    // Check if document exists
    const existingDoc = await insightRef.get();
    
    const insightData: userInsight = {
      ...insights,
      userId,
      updatedAt: now,
      createdAt: existingDoc.exists ? (existingDoc.data()?.createdAt || now) : now
    };
    
    await insightRef.set(insightData, { merge: true });
    
    console.log(`✅ Updated user insights for user: ${userId}`);
  } catch (error) {
    console.error('Error updating user insights:', error);
    throw new Error('Failed to update user insights in Firestore');
  }
}