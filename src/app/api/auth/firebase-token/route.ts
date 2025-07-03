import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { createCustomToken } from '@/lib/firebase-admin';

export async function POST(request: NextRequest) {
  try {
    // Get the Clerk session
    const { userId } = await auth();
    
    if (!userId) {
      return NextResponse.json(
        { error: 'Unauthorized - no valid session found' },
        { status: 401 }
      );
    }

    // Extract any additional claims from the request body
    const body = await request.json().catch(() => ({}));
    const additionalClaims = body.claims || {};

    // Add user ID to claims for Firestore security rules
    const claims = {
      ...additionalClaims,
      clerk_user_id: userId,
    };

    // Create Firebase custom token using the Clerk user ID
    const customToken = await createCustomToken(userId, claims);

    return NextResponse.json({ 
      token: customToken,
      uid: userId 
    });

  } catch (error) {
    console.error('Token exchange error:', error);
    
    // Handle specific error types
    if (error instanceof Error) {
      if (error.message.includes('Firebase project not found')) {
        return NextResponse.json(
          { error: 'Firebase configuration error' },
          { status: 500 }
        );
      }
      
      if (error.message.includes('private key')) {
        return NextResponse.json(
          { error: 'Firebase service account configuration error' },
          { status: 500 }
        );
      }
    }

    return NextResponse.json(
      { error: 'Failed to exchange token' },
      { status: 500 }
    );
  }
}