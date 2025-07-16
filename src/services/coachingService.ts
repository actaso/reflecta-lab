import OpenAI from 'openai';
import { CoachingContext } from '@/types/coaching';
import { CoachingPromptGenerator } from '@/lib/coaching';
import { XMLStreamingParser } from '@/utils/xmlStreamingParser';

/**
 * Coaching Service
 * Handles AI coaching interactions with streaming responses
 * Following Next.js 15 best practices for streaming
 */
export class CoachingService {
  private openrouter: OpenAI;

  constructor() {
    this.openrouter = new OpenAI({
      baseURL: 'https://openrouter.ai/api/v1',
      apiKey: process.env.OPENROUTER_API_KEY,
      defaultHeaders: {
        'X-Title': 'Reflecta Labs',
      },
    });
  }

  /**
   * Generate streaming coaching response using Next.js 15 patterns
   */
  async generateStreamingResponse(context: CoachingContext): Promise<Response> {
    const prompt = CoachingPromptGenerator.generatePrompt(context);
    
    const stream = await this.openrouter.chat.completions.create({
      model: 'openai/gpt-4.1',
      messages: [
        { role: 'system', content: prompt }
      ],
      temperature: 0.7,
      max_tokens: 500,
      stream: true,
    });

    // Create async iterator for streaming data (Next.js 15 pattern)
    const streamIterator = this.createStreamIterator(stream);
    
    // Convert iterator to ReadableStream following Next.js 15 best practices
    const readableStream = new ReadableStream({
      async pull(controller) {
        try {
          const { value, done } = await streamIterator.next();
          
          if (done) {
            controller.close();
          } else {
            controller.enqueue(new TextEncoder().encode(value));
          }
        } catch (error) {
          controller.error(error);
        }
      },
    });

    return new Response(readableStream, {
      headers: {
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache',
        'Connection': 'keep-alive',
      },
    });
  }

  /**
   * Create async iterator for streaming data (Next.js 15 pattern)
   */
  private async* createStreamIterator(stream: AsyncIterable<OpenAI.Chat.Completions.ChatCompletionChunk>) {
    const buffer: string[] = [];

    const parser = new XMLStreamingParser({
      metadata: (data) => {
        buffer.push(`data: ${JSON.stringify({ type: 'metadata', ...data })}\n\n`);
      },
      content: (data) => {
        buffer.push(`data: ${JSON.stringify({ type: 'content', ...data })}\n\n`);
      },
      done: () => {
        buffer.push(`data: ${JSON.stringify({ type: 'done' })}\n\n`);
      },
      fallback: (data) => {
        buffer.push(`data: ${JSON.stringify({ type: 'fallback', ...data })}\n\n`);
      },
      error: (data) => {
        buffer.push(`data: ${JSON.stringify({ type: 'error', ...data })}\n\n`);
      }
    });

    try {
      // Process OpenAI stream
      for await (const chunk of stream) {
        const content = chunk.choices[0]?.delta?.content || '';
        if (content) {
          parser.processChunk(content);
        }

        // Yield any buffered events
        while (buffer.length > 0) {
          yield buffer.shift()!;
        }
      }
      
      // Handle end of stream
      parser.endStream();
      
      // Yield any remaining buffered events
      while (buffer.length > 0) {
        yield buffer.shift()!;
      }
      
    } catch (error) {
      parser.handleError(error instanceof Error ? error : new Error('Unknown error'));
      
      // Yield any error events
      while (buffer.length > 0) {
        yield buffer.shift()!;
      }
    }
  }
}