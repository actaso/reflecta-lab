/**
 * INSIGHT EXTRACTOR API ROUTE
 * 
 * This endpoint extracts insights from coaching sessions and updates user insights in Firestore.
 * 
 * FEATURES:
 * - Extracts insights from coaching session conversations
 * - Updates user insights document with mainFocus, keyBlockers, and plan
 * - Uses Anthropic Claude 3.5 Sonnet via OpenRouter for insight extraction
 * - Builds comprehensive user context for better insight quality
 * 
 * REQUEST PARAMETERS:
 * - sessionId: Required string - The coaching session ID to extract insights from
 * 
 * RESPONSE FORMAT:
 * - JSON response with success status and extracted insights or error message
 * 
 * AUTHENTICATION:
 * - Requires valid Clerk authentication
 * - Uses userId from Clerk for context building and Firestore operations
 */

import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { extractInsightsForSession } from './service';

/**
 * Extract insights from a coaching session
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

    // Parse and validate request
    const body = await request.json();
    const validatedRequest = validateRequest(body);

    // Call the shared service function
    const result = await extractInsightsForSession(validatedRequest.sessionId, userId);

    if (result.success) {
      return NextResponse.json({
        success: true,
        insights: result.insights,
        sessionId: validatedRequest.sessionId
      });
    } else {
      // Determine appropriate status code based on error message
      let statusCode = 500;
      if (result.error?.includes('not found') || result.error?.includes('unauthorized')) {
        statusCode = 404;
      } else if (result.error?.includes('rate limit')) {
        statusCode = 429;
      } else if (result.error?.includes('Invalid') || result.error?.includes('missing')) {
        statusCode = 400;
      }

      return NextResponse.json(
        { success: false, error: result.error || 'Unknown error' },
        { status: statusCode }
      );
    }

  } catch (error) {
    console.error('Insight extractor API error:', error);
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    );
  }
}

/**
 * Validate insight extraction request
 */
function validateRequest(body: unknown): { sessionId: string } {
  if (!body || typeof body !== 'object') {
    throw new Error('Invalid request body');
  }

  const bodyObj = body as Record<string, unknown>;

  if (!bodyObj.sessionId || typeof bodyObj.sessionId !== 'string' || !bodyObj.sessionId.trim()) {
    throw new Error('Invalid or missing sessionId');
  }

  return {
    sessionId: bodyObj.sessionId.trim()
  };
}