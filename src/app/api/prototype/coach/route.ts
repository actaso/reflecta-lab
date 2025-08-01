/**
 * PROTOTYPE COACH API ROUTE
 * 
 * This endpoint provides a simplified coaching interface for prototype testing using OpenRouter.
 * 
 * FEATURES:
 * - Streams responses in real-time using Server-Sent Events (SSE)
 * - Supports multiple coaching session types (default-session, initial-life-deep-dive)
 * - Persists conversation history to Firestore when sessionId is provided
 * - Builds user context from alignment and recent journal entries
 * - Uses Anthropic Claude 3.5 Sonnet via OpenRouter
 * 
 * REQUEST PARAMETERS:
 * - message: Required string - The user's message to the coach
 * - sessionId: Optional string - If provided, conversation is persisted to Firestore
 * - sessionType: Optional PromptType - Determines coaching style ('default-session' | 'initial-life-deep-dive')
 * - conversationHistory: Optional array - Previous messages in the conversation
 * 
 * RESPONSE FORMAT:
 * - Streaming SSE with data chunks containing: { type: 'content'|'done'|'error', content?, sessionId? }
 * - After streaming completes, Firestore document is updated if sessionId provided
 * 
 * AUTHENTICATION:
 * - Requires valid Clerk authentication
 * - Uses userId from Clerk for context building and Firestore operations
 */

import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import OpenAI from 'openai';
import FirestoreAdminService from '@/lib/firestore-admin';
import { PrototypeCoachingPromptLoader, PromptType } from '@/lib/coaching/models/prototypeCoaching/promptLoader';
import { PrototypeCoachRequest, CoachingSession, CoachingSessionMessage } from '@/types/coachingSession';

// Legacy interface removed - using CoachingSessionMessage from types instead

/**
 * Prototype Coach API Route
 * Simplified coaching endpoint for prototype testing with OpenRouter
 */
export async function POST(request: NextRequest) {
  try {
    // Authentication check
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json(
        { success: false, error: 'User not authenticated' },
        { status: 401 }
      );
    }

    // Environment checks
    if (!process.env.OPENROUTER_API_KEY) {
      return NextResponse.json(
        { success: false, error: 'OpenRouter API key not configured' },
        { status: 500 }
      );
    }

    // Parse and validate request
    const body = await request.json();
    const validatedRequest = validateRequest(body);

    // Initialize OpenRouter client
    const openrouter = new OpenAI({
      baseURL: 'https://openrouter.ai/api/v1',
      apiKey: process.env.OPENROUTER_API_KEY,
      defaultHeaders: {
        'X-Title': 'Reflecta Coaching Prototype',
      },
    });

    // Generate coaching system prompt based on session type
    const sessionType = validatedRequest.sessionType || 'default-session';
    const systemPrompt = await generateCoachingSystemPrompt(userId, sessionType);

    // Build conversation context with history
    const messages: { role: 'system' | 'user' | 'assistant', content: string }[] = [
      { role: 'system', content: systemPrompt }
    ];

    // Add conversation history if available (excluding the current message which we'll add separately)
    if (validatedRequest.conversationHistory && validatedRequest.conversationHistory.length > 0) {
      for (const historyMessage of validatedRequest.conversationHistory) {
        messages.push({
          role: historyMessage.role,
          content: historyMessage.content
        });
      }
    }

    // Add the current message
    messages.push({ role: 'user', content: validatedRequest.message });

    console.log(`🧠 Coaching context: ${messages.length} messages (including system prompt), session type: ${sessionType}`);

    // Create streaming response
    const stream = await openrouter.chat.completions.create({
      model: 'anthropic/claude-3.5-sonnet',
      messages,
      temperature: 0.7,
      max_tokens: 1000,
      stream: true,
    });

    // Store the assistant's response for Firestore update
    let assistantResponse = '';

    // Create readable stream for response
    const readableStream = new ReadableStream({
      async start(controller) {
        try {
          for await (const chunk of stream) {
            const content = chunk.choices[0]?.delta?.content || '';
            if (content) {
              assistantResponse += content; // Accumulate response for Firestore
              const data = JSON.stringify({ 
                type: 'content', 
                content,
                sessionId: validatedRequest.sessionId 
              });
              controller.enqueue(new TextEncoder().encode(`data: ${data}\n\n`));
            }
          }
          
          // Update Firestore after streaming completes (if sessionId provided)
          if (validatedRequest.sessionId && assistantResponse.trim()) {
            try {
              await updateCoachingSession(
                validatedRequest.sessionId,
                userId,
                validatedRequest.message,
                assistantResponse,
                sessionType,
                validatedRequest.conversationHistory || []
              );
              console.log(`✅ Updated coaching session: ${validatedRequest.sessionId}`);
            } catch (firestoreError) {
              console.error('Failed to update Firestore:', firestoreError);
              // Don't fail the response if Firestore update fails
            }
          }
          
          // Send completion signal
          const doneData = JSON.stringify({ 
            type: 'done',
            sessionId: validatedRequest.sessionId 
          });
          controller.enqueue(new TextEncoder().encode(`data: ${doneData}\n\n`));
          controller.close();
        } catch (error) {
          const errorData = JSON.stringify({ 
            type: 'error', 
            error: 'Stream error occurred',
            sessionId: validatedRequest.sessionId 
          });
          controller.enqueue(new TextEncoder().encode(`data: ${errorData}\n\n`));
          controller.error(error);
        }
      },
    });

    return new Response(readableStream, {
      headers: {
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache',
        'Connection': 'keep-alive',
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'POST',
        'Access-Control-Allow-Headers': 'Content-Type',
      },
    });

  } catch (error) {
    console.error('Prototype coach API error:', error);
    
    if (error instanceof Error) {
      if (error.message.includes('rate limit')) {
        return NextResponse.json(
          { success: false, error: 'Rate limit exceeded' },
          { status: 429 }
        );
      }
      
      if (error.message.includes('Invalid') || error.message.includes('missing')) {
        return NextResponse.json(
          { success: false, error: error.message },
          { status: 400 }
        );
      }
    }

    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    );
  }
}

/**
 * Validate prototype coach request
 */
function validateRequest(body: unknown): PrototypeCoachRequest {
  if (!body || typeof body !== 'object') {
    throw new Error('Invalid request body');
  }

  const bodyObj = body as Record<string, unknown>;

  if (!bodyObj.message || typeof bodyObj.message !== 'string' || !bodyObj.message.trim()) {
    throw new Error('Invalid or missing message');
  }

  // Validate sessionType if provided
  let sessionType: PromptType | undefined;
  if (bodyObj.sessionType) {
    if (typeof bodyObj.sessionType !== 'string') {
      throw new Error('Invalid sessionType format');
    }
    if (!['default-session', 'initial-life-deep-dive'].includes(bodyObj.sessionType)) {
      throw new Error('Invalid sessionType value. Must be "default-session" or "initial-life-deep-dive"');
    }
    sessionType = bodyObj.sessionType as PromptType;
  }

  // Validate conversation history if provided
  let conversationHistory: CoachingSessionMessage[] | undefined;
  if (bodyObj.conversationHistory) {
    if (!Array.isArray(bodyObj.conversationHistory)) {
      throw new Error('Invalid conversation history format');
    }
    
    conversationHistory = bodyObj.conversationHistory.map((msg: { id: string; role: 'user' | 'assistant'; content: string; timestamp: string }) => ({
      id: msg.id,
      role: msg.role,
      content: msg.content,
      timestamp: new Date(msg.timestamp)
    }));
  }

  return {
    message: bodyObj.message.trim(),
    sessionId: typeof bodyObj.sessionId === 'string' ? bodyObj.sessionId : undefined,
    sessionType,
    conversationHistory
  };
}

/**
 * Update or create coaching session in Firestore
 */
async function updateCoachingSession(
  sessionId: string,
  userId: string,
  userMessage: string,
  assistantMessage: string,
  sessionType: PromptType,
  existingHistory: CoachingSessionMessage[]
): Promise<void> {
  // Skip if no sessionId provided
  if (!sessionId || !sessionId.trim()) {
    return;
  }

  try {
    const db = FirestoreAdminService.getAdminDatabase();
    const sessionRef = db.collection('coachingSessions').doc(sessionId);
    const now = new Date();
    
    // Create new messages
    const userMsg: CoachingSessionMessage = {
      id: `${Date.now()}-user`,
      role: 'user',
      content: userMessage,
      timestamp: now
    };
    
    const assistantMsg: CoachingSessionMessage = {
      id: `${Date.now()}-assistant`,
      role: 'assistant',
      content: assistantMessage,
      timestamp: now
    };

    // Get existing session or prepare for new one
    const sessionDoc = await sessionRef.get();
    let allMessages: CoachingSessionMessage[];
    let createdAt: Date;

    if (sessionDoc.exists) {
      // Update existing session
      const currentSession = sessionDoc.data() as {
        messages: Array<{
          id: string;
          role: 'user' | 'assistant';
          content: string;
          timestamp: unknown;
        }>;
        createdAt: unknown;
        userId: string;
        sessionType: 'default-session' | 'initial-life-deep-dive';
        duration: number;
        wordCount: number;
      };
      
      // Convert messages timestamps from Firestore to Date objects
      const existingMessages: CoachingSessionMessage[] = currentSession.messages.map((msg) => ({
        ...msg,
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        timestamp: (msg.timestamp as any)?.toDate ? (msg.timestamp as any).toDate() : new Date(msg.timestamp as any)
      }));
      
      allMessages = [...existingMessages, userMsg, assistantMsg];
      // Convert Firestore timestamp to Date object
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      createdAt = (currentSession.createdAt as any)?.toDate ? (currentSession.createdAt as any).toDate() : new Date(currentSession.createdAt as any);
    } else {
      // New session
      allMessages = [...existingHistory, userMsg, assistantMsg];
      createdAt = now;
    }

    // Calculate word count for all user messages
    const wordCount = allMessages
      .filter(msg => msg.role === 'user')
      .reduce((count, msg) => count + msg.content.trim().split(/\s+/).length, 0);

    // Calculate duration in seconds
    const duration = Math.floor((now.getTime() - createdAt.getTime()) / 1000);

    const sessionData: CoachingSession = {
      id: sessionId,
      userId,
      sessionType,
      messages: allMessages,
      createdAt,
      updatedAt: now,
      duration,
      wordCount
    };
    
    // Use set with merge to simplify logic
    await sessionRef.set(sessionData, { merge: true });
  } catch (error) {
    console.error('Error updating coaching session:', error);
    throw error;
  }
}

/**
 * Generate user context from alignment and recent journal entries
 */
async function generateUserContext(userId: string): Promise<string> {
  try {
    // Get user account and journal entries in parallel
    const [userAccount, journalEntries] = await Promise.all([
      FirestoreAdminService.getUserAccount(userId),
      FirestoreAdminService.getUserEntries(userId)
    ]);

    let context = '';

    // Add alignment document if available
    if (userAccount.alignment) {
      context += `\n\n=== USER'S CURRENT ALIGNMENT/PRIORITY ===\n${userAccount.alignment}\n`;
      if (userAccount.alignmentSetAt) {
        context += `(Set on: ${userAccount.alignmentSetAt.toLocaleDateString()})\n`;
      }
    }

    // Add past 10 journal entries if available
    if (journalEntries.length > 0) {
      const recentEntries = journalEntries.slice(0, 10);
      context += `\n\n=== RECENT JOURNAL ENTRIES (Last ${recentEntries.length}) ===\n`;
      
      recentEntries.forEach((entry, index) => {
        const entryDate = entry.timestamp.toLocaleDateString();
        context += `\n--- Entry ${index + 1} (${entryDate}) ---\n${entry.content}\n`;
      });
    }

    return context;
  } catch (error) {
    console.error('Error generating user context:', error);
    return ''; // Return empty string if context generation fails
  }
}

/**
 * Generate coaching system prompt for prototype
 */
async function generateCoachingSystemPrompt(userId: string, sessionType: PromptType = 'default-session'): Promise<string> {
  // Load the base prompt from file based on session type
  const basePrompt = PrototypeCoachingPromptLoader.getSystemPrompt(sessionType);

  // Get user context and append it
  const userContext = await generateUserContext(userId);
  
  return basePrompt + userContext;
} 