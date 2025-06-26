import { auth } from '@clerk/nextjs/server';
import { createCustomToken } from '@/lib/firebase-admin';
import { NextRequest } from 'next/server';

/**
 * API endpoint to exchange Clerk session for Firebase custom token
 * POST /api/firebase-token
 */
export async function POST(request: NextRequest) {
  try {
    // Authenticate with Clerk (using async auth)
    const { userId } = await auth();

    if (!userId) {
      return Response.json(
        { error: 'Unauthorized. Please sign in with Clerk.' },
        { status: 401 }
      );
    }

    // Optional: Get additional user data from request body
    let additionalClaims: Record<string, any> = {};
    
    try {
      const body = await request.json();
      if (body.claims && typeof body.claims === 'object') {
        additionalClaims = body.claims;
      }
    } catch {
      // No body or invalid JSON, use empty claims
    }

    // Create Firebase custom token using Clerk user ID
    const customToken = await createCustomToken(userId, additionalClaims);

    return Response.json({ 
      token: customToken,
      userId: userId
    });

  } catch (error) {
    console.error('Firebase token exchange error:', error);

    // Check if it's a Firebase Admin error
    if (error instanceof Error) {
      if (error.message.includes('Missing Firebase Admin credentials')) {
        return Response.json(
          { error: 'Firebase Admin not configured. Please set up service account credentials.' },
          { status: 500 }
        );
      }
      
      if (error.message.includes('Failed to create Firebase custom token')) {
        return Response.json(
          { error: 'Failed to create authentication token. Please try again.' },
          { status: 500 }
        );
      }
    }

    return Response.json(
      { error: 'Internal server error during token exchange.' },
      { status: 500 }
    );
  }
}

/**
 * Handle unsupported HTTP methods
 */
export async function GET() {
  return Response.json(
    { error: 'Method not allowed. Use POST to exchange tokens.' },
    { status: 405 }
  );
}

export async function PUT() {
  return Response.json(
    { error: 'Method not allowed. Use POST to exchange tokens.' },
    { status: 405 }
  );
}

export async function DELETE() {
  return Response.json(
    { error: 'Method not allowed. Use POST to exchange tokens.' },
    { status: 405 }
  );
}