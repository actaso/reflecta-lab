import { NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { FirestoreAdminService } from '../../../../services/firestoreAdminService';
import { formatPulseDate } from '../../../../utils/pulseScoring';
import { PulseEntry } from '../../../../types/journal';

export async function GET() {
  try {
    // Get authenticated user
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const db = FirestoreAdminService.getAdminDatabase();
    if (!db) {
      return NextResponse.json({ error: 'Database unavailable' }, { status: 500 });
    }

    const today = formatPulseDate();

    // Get today's pulse entry
    const todayEntryQuery = await db
      .collection('pulseEntries')
      .where('uid', '==', userId)
      .where('date', '==', today)
      .get();

    let todayEntry: PulseEntry | null = null;
    if (!todayEntryQuery.empty) {
      const doc = todayEntryQuery.docs[0];
      todayEntry = {
        id: doc.id,
        uid: doc.data().uid,
        date: doc.data().date,
        timestamp: doc.data().timestamp.toDate(),
        moodPA: doc.data().moodPA,
        moodNA: doc.data().moodNA,
        stress1: doc.data().stress1,
        stress2: doc.data().stress2,
        selfEfficacy: doc.data().selfEfficacy,
        computedScores: doc.data().computedScores
      };
    }

    // Get recent pulse entries for trends (last 7 days)
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

    const recentEntriesQuery = await db
      .collection('pulseEntries')
      .where('uid', '==', userId)
      .where('timestamp', '>=', sevenDaysAgo)
      .orderBy('timestamp', 'desc')
      .limit(7)
      .get();

    const recentEntries: PulseEntry[] = recentEntriesQuery.docs.map(doc => ({
      id: doc.id,
      uid: doc.data().uid,
      date: doc.data().date,
      timestamp: doc.data().timestamp.toDate(),
      moodPA: doc.data().moodPA,
      moodNA: doc.data().moodNA,
      stress1: doc.data().stress1,
      stress2: doc.data().stress2,
      selfEfficacy: doc.data().selfEfficacy,
      computedScores: doc.data().computedScores
    }));

    return NextResponse.json({
      success: true,
      todayEntry,
      recentEntries,
      hasCompletedToday: todayEntry !== null
    });

  } catch (error) {
    console.error('Error fetching pulse data:', error);
    return NextResponse.json({ 
      error: 'Internal server error' 
    }, { status: 500 });
  }
}