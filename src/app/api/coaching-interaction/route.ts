import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import app from '@/lib/firebase-admin';
import { MultiModelCoachingService } from '@/services/multiModelCoachingService';
import { CoachingContextBuilder } from '@/lib/coaching';
import { CoachingInteractionValidator } from './validation';

/**
 * Coaching Interaction API Route
 * Handles AI-powered coaching prompts with streaming responses
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

    if (!app) {
      return NextResponse.json(
        { success: false, error: 'Firebase Admin SDK not initialized' },
        { status: 500 }
      );
    }

    // Parse and validate request
    const body = await request.json();
    const validatedRequest = CoachingInteractionValidator.validateRequest(body);

    // Build coaching context
    const context = await CoachingContextBuilder.buildContext(validatedRequest, userId);

    // Generate streaming response using multi-model routing
    const coachingService = new MultiModelCoachingService();
    return await coachingService.generateStreamingResponse(context);

  } catch (error) {
    console.error('Coaching interaction API error:', error);
    
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