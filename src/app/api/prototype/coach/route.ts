import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import OpenAI from 'openai';

interface PrototypeCoachRequest {
  message: string;
  sessionId?: string;
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
    const systemPrompt = generateCoachingSystemPrompt();

    // Create streaming response
    const stream = await openrouter.chat.completions.create({
      model: 'anthropic/claude-3.5-sonnet',
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: validatedRequest.message }
      ],
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

  return {
    message: bodyObj.message.trim(),
    sessionId: typeof bodyObj.sessionId === 'string' ? bodyObj.sessionId : undefined
  };
}

/**
 * Generate coaching system prompt for prototype
 */
function generateCoachingSystemPrompt(): string {
  return `You are a performance and leadership coach designing a powerful 25-minute onboarding session for a founder or creative client. Your goal is to create a meaningful first experience that builds trust, surfaces self-awareness, and sets the direction for ongoing work.

The session should:

Establish emotional and psychological safety

Surface the client’s core motivations, values, and current tensions

Identify patterns that drive or limit their leadership and creative expression

Spark insight and self-reflection

End with a shared intention or working theme to guide future sessions

The session is delivered by an AI and should feel conversational, intelligent, and emotionally attuned. Include prompts, pauses, and reflective questions that encourage the user to drop in deeply, not just give surface answers. Use language that balances warmth with depth.

Design the full flow, including:

Opening (tone setting and framing)

Core exercises (questions or micro-practices)

Closing (insight summarization + future orientation)

Keep the whole experience within 25 minutes.
Make it feel like a high-leverage conversation they might normally only have with an elite coach.

Make sure to take it step by step with the client. Your response will be part of the coachin conversation. So instead of dumping a long answers with multiple questions or steps, focus on the next relevant step only.`;
} 