/**
 * COACHING SESSIONS API ROUTE
 * 
 * This endpoint handles loading existing coaching sessions from Firestore.
 * Used for session persistence and continuation across browser sessions.
 * 
 * FEATURES:
 * - Loads existing session data by sessionId
 * - Validates user ownership of sessions
 * - Returns formatted session data for client consumption
 * 
 * AUTHENTICATION:
 * - Requires valid Clerk authentication
 * - Only allows users to access their own sessions
 */

import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import FirestoreAdminService from '@/lib/firestore-admin';
import { CoachingSession } from '@/types/coachingSession';

/**
 * Load an existing coaching session
 */
export async function GET(request: NextRequest) {
  try {
    // Authentication check
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json(
        { success: false, error: 'User not authenticated' },
        { status: 401 }
      );
    }

    // Get sessionId from query params
    const { searchParams } = new URL(request.url);
    const sessionId = searchParams.get('sessionId');

    if (!sessionId || !sessionId.trim()) {
      return NextResponse.json(
        { success: false, error: 'sessionId is required' },
        { status: 400 }
      );
    }

    // Load session from Firestore
    const db = FirestoreAdminService.getAdminDatabase();
    const sessionRef = db.collection('coachingSessions').doc(sessionId);
    const sessionDoc = await sessionRef.get();

    if (!sessionDoc.exists) {
      return NextResponse.json(
        { success: false, error: 'Session not found' },
        { status: 404 }
      );
    }

    const sessionData = sessionDoc.data() as {
      id: string;
      userId: string;
      sessionType: 'default-session' | 'initial-life-deep-dive';
      messages: Array<{
        id: string;
        role: 'user' | 'assistant';
        content: string;
        timestamp: unknown;
      }>;
      createdAt: unknown;
      updatedAt: unknown;
      duration: number;
      wordCount: number;
    };

    // Verify user ownership
    if (sessionData.userId !== userId) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized access to session' },
        { status: 403 }
      );
    }

    // Convert Firestore timestamps to Date objects for client consumption
    const formattedSession: CoachingSession = {
      id: sessionData.id,
      userId: sessionData.userId,
      sessionType: sessionData.sessionType,
      messages: sessionData.messages.map((msg) => ({
        id: msg.id,
        role: msg.role,
        content: msg.content,
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        timestamp: (msg.timestamp as any)?.toDate ? (msg.timestamp as any).toDate() : new Date(msg.timestamp as any)
      })),
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      createdAt: (sessionData.createdAt as any)?.toDate ? (sessionData.createdAt as any).toDate() : new Date(sessionData.createdAt as any),
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      updatedAt: (sessionData.updatedAt as any)?.toDate ? (sessionData.updatedAt as any).toDate() : new Date(sessionData.updatedAt as any),
      duration: sessionData.duration,
      wordCount: sessionData.wordCount
    };

    return NextResponse.json({
      success: true,
      session: formattedSession
    });

  } catch (error) {
    console.error('Error loading coaching session:', error);
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    );
  }
}