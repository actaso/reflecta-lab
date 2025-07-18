import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import OpenAI from 'openai';

interface CoachingMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: Date;
}

interface ProgressEvaluationRequest {
  conversationHistory: CoachingMessage[];
  previousProgress: number;
  sessionId?: string;
}

interface ProgressEvaluationResponse {
  progress: number;
  rationale: string;
}

/**
 * Progress Evaluation API Route
 * Uses a cheap LLM model to evaluate coaching session progress based on 5 key dimensions
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
        'X-Title': 'Reflecta Progress Evaluation',
      },
    });

    // Generate evaluation prompt
    const evaluationPrompt = generateEvaluationPrompt(
      validatedRequest.conversationHistory,
      validatedRequest.previousProgress
    );

    console.log(`🎯 Evaluating progress for session with ${validatedRequest.conversationHistory.length} messages, previous progress: ${validatedRequest.previousProgress}%`);

    // Call cheap model for evaluation
    const response = await openrouter.chat.completions.create({
      model: 'anthropic/claude-3-haiku', // Cheap model for cost efficiency
      messages: [
        { role: 'system', content: getSystemPrompt() },
        { role: 'user', content: evaluationPrompt }
      ],
      temperature: 0.3, // Lower temperature for more consistent evaluation
      max_tokens: 400, // Small response for just progress + rationale
    });

    const aiResponse = response.choices[0]?.message?.content;
    if (!aiResponse) {
      throw new Error('No response from AI model');
    }

    // Parse the JSON response
    let evaluationResult: ProgressEvaluationResponse;
    try {
      // Clean up response (remove any markdown formatting)
      const cleanedResponse = aiResponse.replace(/```json\s*|\s*```/g, '').trim();
      evaluationResult = JSON.parse(cleanedResponse);
      
      // Validate the response structure
      if (typeof evaluationResult.progress !== 'number' || 
          typeof evaluationResult.rationale !== 'string') {
        throw new Error('Invalid response structure');
      }

      // Ensure progress is within bounds and monotonic
      evaluationResult.progress = Math.max(
        validatedRequest.previousProgress, 
        Math.min(100, Math.max(0, Math.round(evaluationResult.progress)))
      );

    } catch (parseError) {
      console.error('Failed to parse evaluation response:', parseError);
      console.error('Raw AI response:', aiResponse);
      
      // Fallback to incremental progress
      evaluationResult = {
        progress: Math.min(100, validatedRequest.previousProgress + 5),
        rationale: "Evaluation parsing failed, using incremental progress as fallback"
      };
    }

    console.log(`📊 Progress evaluation: ${validatedRequest.previousProgress}% → ${evaluationResult.progress}% (${evaluationResult.rationale})`);

    return NextResponse.json({
      success: true,
      progress: evaluationResult.progress,
      rationale: evaluationResult.rationale,
      previousProgress: validatedRequest.previousProgress
    });

  } catch (error) {
    console.error('Progress evaluation API error:', error);
    
    // Return incremental fallback on any error
    const body = await request.json().catch(() => ({ previousProgress: 0 }));
    const fallbackProgress = Math.min(100, (body.previousProgress || 0) + 5);
    
    return NextResponse.json({
      success: false,
      error: 'Evaluation failed, using fallback',
      progress: fallbackProgress,
      rationale: "Evaluation service unavailable, using incremental progress",
      fallback: true
    });
  }
}

/**
 * Validate progress evaluation request
 */
function validateRequest(body: unknown): ProgressEvaluationRequest {
  if (!body || typeof body !== 'object') {
    throw new Error('Invalid request body');
  }

  const bodyObj = body as Record<string, unknown>;

  if (!Array.isArray(bodyObj.conversationHistory)) {
    throw new Error('Invalid or missing conversationHistory');
  }

  if (typeof bodyObj.previousProgress !== 'number' || 
      bodyObj.previousProgress < 0 || 
      bodyObj.previousProgress > 100) {
    throw new Error('Invalid previousProgress - must be number between 0-100');
  }

  // Validate conversation history structure
  const conversationHistory = bodyObj.conversationHistory.map((msg: any) => ({
    id: msg.id,
    role: msg.role,
    content: msg.content,
    timestamp: new Date(msg.timestamp)
  }));

  return {
    conversationHistory,
    previousProgress: bodyObj.previousProgress,
    sessionId: typeof bodyObj.sessionId === 'string' ? bodyObj.sessionId : undefined
  };
}

/**
 * Generate system prompt for progress evaluation
 */
function getSystemPrompt(): string {
  return `You are an AI coaching facilitator that, at any point during a 25-minute onboarding session, must self-evaluate how far the session has progressed—on a scale from 0% to 100%.

0% means "we have not yet established psychological safety, surfaced motivations, identified patterns, sparked insight, or set a shared intention," and 100% means "we have fully accomplished all five of those objectives."

Evaluation criteria:
- **Psychological safety**: Has rapport and trust been built?
- **Self-awareness**: Have core motivations, values, tensions been surfaced?
- **Pattern identification**: Have limiting/driving patterns been named?
- **Insight**: Has a genuine "a-ha" moment or deep reflection occurred?
- **Shared intention**: Has a working theme or next-steps focus been co-created?

Scoring rules:
- Estimate on each of the five dimensions how "complete" you are (0–100%).
- Compute the average of those five sub-scores to get a raw current_progress.
- **Monotonicity**: If current_progress < previous_progress, set current_progress = previous_progress.

Be critical and honest in your evaluation

Return **only** valid JSON with two keys:
{
  "rationale": "<one-sentence summary of why you chose that number>",
  "progress": <current_progress>,
}

Ensure "progress" is an integer between 0 and 100, and ≥ previous_progress.`;
}

/**
 * Generate evaluation prompt from conversation history
 */
function generateEvaluationPrompt(
  conversationHistory: CoachingMessage[], 
  previousProgress: number
): string {
  // Format conversation for evaluation
  const transcript = conversationHistory
    .map(msg => `${msg.role.toUpperCase()}: ${msg.content}`)
    .join('\n\n');

  return `Input:
- Full session transcript so far
- Previous progress: ${previousProgress}%

Session Transcript:
${transcript}

Please evaluate the current progress based on the five coaching dimensions and provide your assessment in the required JSON format.`;
} 