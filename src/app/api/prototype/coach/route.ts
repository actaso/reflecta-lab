import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import OpenAI from 'openai';
import FirestoreAdminService from '@/lib/firestore-admin';
import { PrototypeCoachingPromptLoader } from '@/lib/coaching/models/prototypeCoaching/promptLoader';

interface CoachingMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: Date;
}

interface PrototypeCoachRequest {
  message: string;
  sessionId?: string;
  conversationHistory?: CoachingMessage[];
}

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

    // Generate coaching system prompt
    const systemPrompt = await generateCoachingSystemPrompt(userId);

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

    console.log(`🧠 Coaching context: ${messages.length} messages (including system prompt)`);

    // Create streaming response
    const stream = await openrouter.chat.completions.create({
      model: 'anthropic/claude-3.5-sonnet',
      messages,
      temperature: 0.7,
      max_tokens: 1000,
      stream: true,
    });

    // Create readable stream for response
    const readableStream = new ReadableStream({
      async start(controller) {
        try {
          for await (const chunk of stream) {
            const content = chunk.choices[0]?.delta?.content || '';
            if (content) {
              const data = JSON.stringify({ 
                type: 'content', 
                content,
                sessionId: validatedRequest.sessionId 
              });
              controller.enqueue(new TextEncoder().encode(`data: ${data}\n\n`));
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

  // Validate conversation history if provided
  let conversationHistory: CoachingMessage[] | undefined;
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
    conversationHistory
  };
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
async function generateCoachingSystemPrompt(userId: string): Promise<string> {
  // Determine which prompt to use (for now, always default session)
  const promptType = PrototypeCoachingPromptLoader.determinePromptType(userId);
  
  // Load the base prompt from file
  const basePrompt = PrototypeCoachingPromptLoader.getSystemPrompt(promptType);

  // Get user context and append it
  const userContext = await generateUserContext(userId);
  
  return basePrompt + userContext;
} 