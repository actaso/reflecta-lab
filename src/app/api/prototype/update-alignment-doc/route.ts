import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';

interface CoachingMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: Date;
}

interface UpdateAlignmentDocRequest {
  conversationHistory: CoachingMessage[];
  sessionId?: string;
}



/**
 * Update Alignment Doc API Route
 * Analyzes coaching session and updates user's alignment document
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

    // Use shared logic to update alignment document
    const { updateAlignmentDoc } = await import('./update-alignment-doc-logic');
    const result = await updateAlignmentDoc(
      validatedRequest.conversationHistory,
      validatedRequest.sessionId,
      userId
    );

    return NextResponse.json({
      success: true,
      version: result.version,
      lastUpdatedAt: result.lastUpdatedAt
    });

  } catch (error) {
    console.error('Update alignment doc API error:', error);
    
    return NextResponse.json(
      { success: false, error: 'Failed to update alignment document' },
      { status: 500 }
    );
  }
}

/**
 * Validate update alignment doc request
 */
function validateRequest(body: unknown): UpdateAlignmentDocRequest {
  if (!body || typeof body !== 'object') {
    throw new Error('Invalid request body');
  }

  const bodyObj = body as Record<string, unknown>;

  if (!Array.isArray(bodyObj.conversationHistory)) {
    throw new Error('Invalid or missing conversationHistory');
  }

  // Validate conversation history structure
  const conversationHistory = bodyObj.conversationHistory.map((msg: { id: string; role: 'user' | 'assistant'; content: string; timestamp: string }) => ({
    id: msg.id,
    role: msg.role,
    content: msg.content,
    timestamp: new Date(msg.timestamp)
  }));

  return {
    conversationHistory,
    sessionId: typeof bodyObj.sessionId === 'string' ? bodyObj.sessionId : undefined
  };
}

 