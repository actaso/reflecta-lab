import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { FirestoreAdminService } from '../../../../services/firestoreAdminService';
import { computePulseScores, formatPulseDate } from '../../../../utils/pulseScoring';
import { PulseEntry } from '../../../../types/journal';

export async function POST(request: NextRequest) {
  try {
    // Get authenticated user
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Parse request body
    const body = await request.json();
    const { moodPA, moodNA, stress1, stress2, selfEfficacy } = body;

    // Validate required fields
    if (
      typeof moodPA !== 'number' || 
      typeof moodNA !== 'number' ||
      typeof stress1 !== 'number' ||
      typeof stress2 !== 'number' ||
      typeof selfEfficacy !== 'number'
    ) {
      return NextResponse.json({ 
        error: 'All pulse responses are required and must be numbers' 
      }, { status: 400 });
    }

    // Validate ranges
    if (moodPA < 0 || moodPA > 10 || moodNA < 0 || moodNA > 10 || 
        stress1 < 0 || stress1 > 4 || stress2 < 0 || stress2 > 4 ||
        selfEfficacy < 0 || selfEfficacy > 10) {
      return NextResponse.json({ 
        error: 'Response values are out of valid range' 
      }, { status: 400 });
    }

    // Compute normalized scores
    const computedScores = computePulseScores({
      moodPA, moodNA, stress1, stress2, selfEfficacy
    });

    const now = new Date();
    const today = formatPulseDate(now);

    // Check if user already has a pulse entry for today
    const db = FirestoreAdminService.getAdminDatabase();
    if (!db) {
      return NextResponse.json({ error: 'Database unavailable' }, { status: 500 });
    }
    
    const existingEntry = await db
      .collection('pulseEntries')
      .where('uid', '==', userId)
      .where('date', '==', today)
      .get();

    let pulseEntry: PulseEntry;

    if (!existingEntry.empty) {
      // Update existing entry
      const docRef = existingEntry.docs[0].ref;
      pulseEntry = {
        id: docRef.id,
        uid: userId,
        date: today,
        timestamp: now,
        moodPA,
        moodNA,
        stress1,
        stress2,
        selfEfficacy,
        computedScores
      };

      await docRef.update({
        timestamp: now,
        moodPA,
        moodNA,
        stress1,
        stress2,
        selfEfficacy,
        computedScores
      });
    } else {
      // Create new entry
      const docRef = await db.collection('pulseEntries').add({
        uid: userId,
        date: today,
        timestamp: now,
        moodPA,
        moodNA,
        stress1,
        stress2,
        selfEfficacy,
        computedScores
      });

      pulseEntry = {
        id: docRef.id,
        uid: userId,
        date: today,
        timestamp: now,
        moodPA,
        moodNA,
        stress1,
        stress2,
        selfEfficacy,
        computedScores
      };
    }

    return NextResponse.json({
      success: true,
      pulseEntry,
      computedScores
    });

  } catch (error) {
    console.error('Error submitting pulse:', error);
    return NextResponse.json({ 
      error: 'Internal server error' 
    }, { status: 500 });
  }
}