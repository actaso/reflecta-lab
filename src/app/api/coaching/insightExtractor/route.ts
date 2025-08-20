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
    // Admin override header allows triggering on behalf of a user for recovery/manual operations
    // Admin header + env secret
    const adminTokenHeader = request.headers.get('x-admin-manual-secret');
    const adminTokenEnv = process.env.ADMIN_MANUAL_SECRET;
    const isAdminHeaderValid = Boolean(adminTokenHeader && adminTokenEnv && adminTokenHeader === adminTokenEnv);

    // Authentication check (unless admin override header is valid)
    let effectiveUserId: string | null = null;
    if (isAdminHeaderValid) {
      // Admin override mode; userId will be validated from request body
      effectiveUserId = null;
    } else {
      const { userId } = await auth();
      if (!userId) {
        return NextResponse.json(
          { success: false, error: 'User not authenticated' },
          { status: 401 }
        );
      }
      effectiveUserId = userId;
    }

    // Parse and validate request
    const body = await request.json();
    const validatedRequest = validateRequest(body, {
      allowUserIdOverride: false
    });

    // Call the shared service function
    // If admin override is active, pass null userId to derive from session (admin mode)
    const isAdmin = isAdminHeaderValid;
    const userIdToUse = isAdmin ? null : effectiveUserId!;
    const result = await extractInsightsForSession(validatedRequest.sessionId, userIdToUse);

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
function validateRequest(body: unknown, _options?: { allowUserIdOverride?: boolean }): { sessionId: string } {
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