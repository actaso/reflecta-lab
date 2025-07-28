import { NextResponse } from 'next/server';
import { evaluateCoachingMessage } from './logic';

/**
 * POST /api/prototype/coaching-message-evaluator
 * 
 * Evaluates whether to send a coaching message to a user and what content to send.
 * Uses a two-step AI evaluation process:
 * 1. Impact evaluation - determines message type and content
 * 2. Outcome simulation - quality check and final send decision
 */
export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { userId } = body;

    // Validate required parameters
    if (!userId) {
      return NextResponse.json(
        { 
          error: 'Missing required parameter: userId',
          example: { userId: 'user123' }
        }, 
        { status: 400 }
      );
    }

    if (typeof userId !== 'string') {
      return NextResponse.json(
        { error: 'userId must be a string' }, 
        { status: 400 }
      );
    }

    console.log(`🚀 Starting coaching message evaluation for user: ${userId}`);

    // Run the two-step evaluation process
    const result = await evaluateCoachingMessage(userId);

    if (result.shouldSend && result.message) {
      // Simulate sending the message (console.log for now)
      console.log(`🤖 COACHING MESSAGE SENT to ${userId}:`);
      console.log(`   Type: ${result.message.messageType}`);
      console.log(`   Push Notification: "${result.message.pushNotificationText}"`);
      console.log(`   Full Message: "${result.message.fullMessage}"`);
      console.log(`   Confidence: ${result.message.aiMetadata.confidenceScore}`);
      console.log(`   Message ID: ${result.message.id}`);
    } else {
      console.log(`❌ Decision: Do not send message to ${userId}`);
      console.log(`   Reasoning: ${result.reasoning}`);
    }

    // Return detailed response
    return NextResponse.json({
      success: true,
      userId,
      shouldSend: result.shouldSend,
      message: result.message || null,
      reasoning: result.reasoning,
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error('Error in coaching message evaluator:', error);
    
    // Return appropriate error response
    const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
    
    return NextResponse.json(
      { 
        error: 'Internal server error',
        details: errorMessage,
        timestamp: new Date().toISOString()
      }, 
      { status: 500 }
    );
  }
}

/**
 * GET /api/prototype/coaching-message-evaluator
 * 
 * Returns API documentation and usage information
 */
export async function GET() {
  return NextResponse.json({
    name: 'Coaching Message Evaluator',
    description: 'Evaluates whether to send coaching messages to users using AI',
    version: '1.0.0',
    endpoints: {
      POST: {
        description: 'Evaluate and potentially send a coaching message',
        parameters: {
          userId: {
            type: 'string',
            required: true,
            description: 'The ID of the user to evaluate'
          }
        },
        example: {
          request: { userId: 'user123' },
          response: {
            success: true,
            userId: 'user123',
            shouldSend: true,
            message: {
              id: 'msg456',
              messageType: 'check_in',
              content: 'How are you feeling about your goals this week?',
              generatedAt: '2024-01-01T12:00:00.000Z',
              aiMetadata: {
                confidenceScore: 0.85,
                reasoningSteps: ['...']
              }
            },
            reasoning: 'User has been consistent with journaling and ready for accountability check-in',
            timestamp: '2024-01-01T12:00:00.000Z'
          }
        }
      }
    },
    messageTypes: {
      check_in: 'Accountability check-ins to help users stay on track',
      encouragement: 'Positive reinforcement and celebration of progress',
      challenge: 'Growth opportunities that push users in a supportive way',
      reminder: 'Gentle nudges about practices or commitments',
      alignment_reflection: 'Questions about core purpose and life direction',
      general_reflection: 'Broader questions for self-understanding',
      personal_insight: 'Deep insights about patterns and behaviors',
      relevant_lesson: 'Applicable wisdom and perspectives'
    },
    process: {
      '1': 'Gather user context (messages, alignment doc, journal entries)',
      '2': 'AI impact evaluation - determine message type and content',
      '3': 'AI outcome simulation - quality check and final decision',
      '4': 'Create and save message if decision is to send'
    }
  });
} 