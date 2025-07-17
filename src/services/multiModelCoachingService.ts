import OpenAI from 'openai';
import { CoachingContext } from '@/types/coaching';
import { ModelRegistry, initializeCoachingModels } from '@/lib/coaching';
import { XMLStreamingParser } from '@/utils/xmlStreamingParser';

/**
 * Multi-Model Coaching Service
 * Routes coaching requests to appropriate models based on context
 * Handles AI coaching interactions with streaming responses
 */
export class MultiModelCoachingService {
  private openrouter: OpenAI;
  private modelsInitialized: Promise<void>;

  constructor() {
    // Initialize coaching models asynchronously
    this.modelsInitialized = initializeCoachingModels();
    
    this.openrouter = new OpenAI({
      baseURL: 'https://openrouter.ai/api/v1',
      apiKey: process.env.OPENROUTER_API_KEY,
      defaultHeaders: {
        'X-Title': 'Reflecta Labs',
      },
    });
  }

  /**
   * Generate streaming coaching response using model routing
   */
  async generateStreamingResponse(context: CoachingContext): Promise<Response> {
    // Ensure models are initialized
    await this.modelsInitialized;
    
    // Route to appropriate model based on context
    const routingDecision = ModelRegistry.routeToModel(context);
    const model = ModelRegistry.getModel(routingDecision.modelId);
 
    if (!model) {
      throw new Error(`Model ${routingDecision.modelId} not found in registry`);
    }

    console.log(`🎯 Routing to model: ${routingDecision.modelId} - ${routingDecision.reason}`);

    // Generate prompts using the selected model
    const systemPrompt = model.generateSystemPrompt();
    const userMessage = model.generateContextMessage(context);

    console.log(`📝 Using model: ${model.getInfo().name}`);
    console.log('System prompt:', systemPrompt);
    console.log('User message:', userMessage);
    
    const stream = await this.openrouter.chat.completions.create({
      model: 'openai/gpt-4.1',
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userMessage }
      ],
      temperature: 0.7,
      max_tokens: 1500,
      stream: true,
    });

    // Create async iterator for streaming data (Next.js 15 pattern)
    const streamIterator = this.createStreamIterator(stream, model.getInfo().name);
    
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
        'X-Coaching-Model': routingDecision.modelId, // Add model info to headers
        'X-Routing-Reason': encodeURIComponent(routingDecision.reason),
      },
    });
  }

  /**
   * Create async iterator for streaming data with model context
   */
  private async* createStreamIterator(
    stream: AsyncIterable<OpenAI.Chat.Completions.ChatCompletionChunk>,
    modelName: string
  ) {
    const buffer: string[] = [];
    let fullResponse = ''; // Collect full response for logging

    const parser = new XMLStreamingParser({
      thinking: (data) => {
        buffer.push(`data: ${JSON.stringify({ type: 'thinking', model: modelName, ...data })}\n\n`);
      },
      metadata: (data) => {
        buffer.push(`data: ${JSON.stringify({ type: 'metadata', model: modelName, ...data })}\n\n`);
      },
      content: (data) => {
        buffer.push(`data: ${JSON.stringify({ type: 'content', model: modelName, ...data })}\n\n`);
      },
      done: () => {
        buffer.push(`data: ${JSON.stringify({ type: 'done', model: modelName })}\n\n`);
      },
      fallback: (data) => {
        buffer.push(`data: ${JSON.stringify({ type: 'fallback', model: modelName, ...data })}\n\n`);
      },
      error: (data) => {
        buffer.push(`data: ${JSON.stringify({ type: 'error', model: modelName, ...data })}\n\n`);
      }
    });

    try {
      // Process OpenAI stream
      for await (const chunk of stream) {
        const content = chunk.choices[0]?.delta?.content || '';
        if (content) {
          // Accumulate full response
          fullResponse += content;
          
          // Send raw content for client logging
          buffer.push(`data: ${JSON.stringify({ type: 'raw', model: modelName, content })}\n\n`);
          
          // Parse content for structured events
          parser.processChunk(content);
        }

        // Yield any buffered events
        while (buffer.length > 0) {
          yield buffer.shift()!;
        }
      }
      
      // Send complete response for logging
      buffer.push(`data: ${JSON.stringify({ type: 'full_response', model: modelName, content: fullResponse })}\n\n`);
      
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