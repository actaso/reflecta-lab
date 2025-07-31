/**
 * COACHING SESSION API ROUTE
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

    const sessionData = sessionDoc.data() as any;

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
      messages: sessionData.messages.map((msg: any) => ({
        id: msg.id,
        role: msg.role,
        content: msg.content,
        timestamp: msg.timestamp.toDate ? msg.timestamp.toDate() : new Date(msg.timestamp)
      })),
      createdAt: sessionData.createdAt.toDate ? sessionData.createdAt.toDate() : new Date(sessionData.createdAt),
      updatedAt: sessionData.updatedAt.toDate ? sessionData.updatedAt.toDate() : new Date(sessionData.updatedAt),
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