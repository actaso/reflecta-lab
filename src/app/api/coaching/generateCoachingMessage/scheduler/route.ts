/**
 * COACHING MESSAGE SCHEDULER API ROUTE
 * 
 * This is the new recommended architecture that replaces the monolithic cron job.
 * Instead of processing all users in one function, this creates individual jobs
 * for each user that needs a coaching message.
 * 
 * FEATURES:
 * - Lightweight scheduler that runs every hour
 * - Creates individual processing jobs per user
 * - Avoids timeout issues by distributing work
 * - Better error isolation and retry capabilities
 * - Supports parallel processing of users
 * 
 * USAGE:
 * - Set up cron job to call this endpoint every hour
 * - This will trigger individual user processing jobs
 * - Each user gets processed in a separate function call
 */

import { NextRequest, NextResponse } from 'next/server';
import { FirestoreAdminService } from '@/services/firestoreAdminService';
import { UserAccount } from '@/types/journal';

/**
 * Scheduler endpoint - creates individual jobs for each user due for coaching
 * Supports both GET (for Vercel cron) and POST (for manual triggers)
 */
export async function GET(request: NextRequest) {
  return handleSchedulerRequest(request);
}

export async function POST(request: NextRequest) {
  return handleSchedulerRequest(request);
}

async function handleSchedulerRequest(request: NextRequest) {
  try {
    console.log('🕐 [COACHING-SCHEDULER] Starting coaching message scheduler');
    
    // Verify this is a cron job request in production
    if (process.env.NODE_ENV === 'production') {
      const authHeader = request.headers.get('authorization');
      if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
        return NextResponse.json(
          { success: false, error: 'Unauthorized' },
          { status: 401 }
        );
      }
    }

    // Get users who are due for coaching messages (optimized query)
    const [usersDue, usersNeedingBootstrap] = await Promise.all([
      FirestoreAdminService.getUsersDueForCoachingMessage(),
      FirestoreAdminService.getUsersNeedingCoachingScheduleBootstrap()
    ]);

    console.log(`🕐 [COACHING-SCHEDULER] Found ${usersDue.length} users due for coaching messages`);
    console.log(`🔧 [COACHING-SCHEDULER] Found ${usersNeedingBootstrap.length} users needing schedule bootstrap`);

    const results = {
      usersDue: usersDue.length,
      usersBootstrapped: 0,
      jobsCreated: 0,
      errors: 0
    };

    const jobPromises: Promise<void>[] = [];

    // Bootstrap users who need nextCoachingMessageDue to be set
    for (const user of usersNeedingBootstrap) {
      try {
        const nextDueTime = calculateNextCoachingMessageDue(user);
        await FirestoreAdminService.updateUserNextCoachingMessageDue(user.uid, nextDueTime);
        results.usersBootstrapped++;
        console.log(`🔧 [COACHING-SCHEDULER] Bootstrapped schedule for user ${user.uid}`);
      } catch (error) {
        results.errors++;
        console.error(`❌ [COACHING-SCHEDULER] Error bootstrapping user ${user.uid}:`, error);
      }
    }

    // Process users who are due for messages
    for (const user of usersDue) {
      try {
        // Check if user is in their preferred time window
        const isInTimeWindow = isUserInPreferredTimeWindow(user);
        
        if (isInTimeWindow) {
          results.jobsCreated++;
          console.log(`🎯 [COACHING-SCHEDULER] Creating job for user ${user.uid}`);
          
          // Create individual processing job (non-blocking)
          const jobPromise = createUserProcessingJob(user.uid);
          jobPromises.push(jobPromise);
        } else {
          // User is due but not in time window - schedule for next time window
          const nextDueTime = calculateNextTimeWindowForUser(user);
          await FirestoreAdminService.updateUserNextCoachingMessageDue(user.uid, nextDueTime);
          console.log(`⏰ [COACHING-SCHEDULER] User ${user.uid} due but outside time window, rescheduled`);
        }
      } catch (error) {
        results.errors++;
        console.error(`❌ [COACHING-SCHEDULER] Error processing user ${user.uid}:`, error);
      }
    }

    // Wait for all jobs to be created (but not processed)
    await Promise.allSettled(jobPromises);

    console.log('🕐 [COACHING-SCHEDULER] Scheduler complete:', results);

    return NextResponse.json({
      success: true,
      results
    });

  } catch (error) {
    console.error('❌ [COACHING-SCHEDULER] Fatal error in scheduler:', error);
    
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    );
  }
}

/**
 * Create an individual processing job for a user
 */
async function createUserProcessingJob(userId: string): Promise<void> {
  try {
    const baseUrl = process.env.VERCEL_URL 
      ? `https://${process.env.VERCEL_URL}` 
      : 'http://localhost:3000';
    
    const response = await fetch(`${baseUrl}/api/coaching/generateCoachingMessage/processor`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${process.env.CRON_SECRET || 'dev'}`
      },
      body: JSON.stringify({ userId })
    });

    if (!response.ok) {
      throw new Error(`Failed to create job for user ${userId}: ${response.statusText}`);
    }

    console.log(`✅ [COACHING-SCHEDULER] Created job for user ${userId}`);
  } catch (error) {
    console.error(`❌ [COACHING-SCHEDULER] Failed to create job for user ${userId}:`, error);
    throw error;
  }
}

/**
 * Check if user is currently in their preferred time window
 */
function isUserInPreferredTimeWindow(user: UserAccount): boolean {
  const now = new Date();
  const userTimezone = user.userTimezone || 'America/New_York';
  
  // Get current time in user's timezone
  const userLocalTime = new Date(now.toLocaleString('en-US', { timeZone: userTimezone }));
  const userHour = userLocalTime.getHours();
  
  const timePreference = user.coachingConfig.coachingMessageTimePreference;
  
  switch (timePreference) {
    case 'morning':
      return userHour >= 6 && userHour <= 11;
    case 'afternoon':
      return userHour >= 12 && userHour <= 17;
    case 'evening':
      return userHour >= 18 && userHour <= 21;
    default:
      return userHour >= 6 && userHour <= 21; // Default to reasonable hours
  }
}

/**
 * Calculate the next coaching message due time based on user preferences
 * @param user - User account with coaching preferences
 * @param justSentMessage - Whether a message was just sent (affects timing)
 */
function calculateNextCoachingMessageDue(user: UserAccount /* , justSentMessage: boolean */): number {
  const now = new Date();
  const userTimezone = user.userTimezone || 'America/New_York';
  const frequency = user.coachingConfig.coachingMessageFrequency;
  const timePreference = user.coachingConfig.coachingMessageTimePreference;

  // Calculate hours to add based on frequency
  let hoursToAdd = 0;
  switch (frequency) {
    case 'daily':
      hoursToAdd = 24;
      break;
    case 'multipleTimesPerWeek':
      hoursToAdd = 48; // 2 days
      break;
    case 'onceAWeek':
      hoursToAdd = 168; // 7 days
      break;
  }

  // For bootstrap, start with a shorter interval to get them into the system sooner
  // This function is only used for bootstrapping new users
  switch (frequency) {
    case 'daily':
      hoursToAdd = Math.random() * 6 + 1; // 1-7 hours
      break;
    case 'multipleTimesPerWeek':
      hoursToAdd = Math.random() * 12 + 1; // 1-13 hours  
      break;
    case 'onceAWeek':
      hoursToAdd = Math.random() * 24 + 1; // 1-25 hours
      break;
  }

  // Calculate next time
  const nextTime = new Date(now.getTime() + (hoursToAdd * 60 * 60 * 1000));
  
  // Convert to user's timezone and adjust to preferred time window
  const userLocalTime = new Date(nextTime.toLocaleString('en-US', { timeZone: userTimezone }));
  
  let targetHour = 9; // Default to 9 AM
  switch (timePreference) {
    case 'morning':
      targetHour = 8; // 8 AM
      break;
    case 'afternoon':
      targetHour = 14; // 2 PM
      break;
    case 'evening':
      targetHour = 19; // 7 PM
      break;
  }

  // Set to the preferred hour
  userLocalTime.setHours(targetHour, 0, 0, 0);
  
  // If the calculated time is in the past, move to next day
  if (userLocalTime.getTime() <= now.getTime()) {
    userLocalTime.setDate(userLocalTime.getDate() + 1);
  }
  
  return userLocalTime.getTime();
}

/**
 * Calculate next time window for user who is due but outside current window
 */
function calculateNextTimeWindowForUser(user: UserAccount): number {
  const now = new Date();
  const userTimezone = user.userTimezone || 'America/New_York';
  const timePreference = user.coachingConfig.coachingMessageTimePreference;
  
  // Get current time in user's timezone
  const userLocalTime = new Date(now.toLocaleString('en-US', { timeZone: userTimezone }));
  
  let targetHour = 9;
  switch (timePreference) {
    case 'morning':
      targetHour = 8; // 8 AM
      break;
    case 'afternoon':
      targetHour = 14; // 2 PM
      break;
    case 'evening':
      targetHour = 19; // 7 PM
      break;
  }

  // Set to the preferred hour today
  userLocalTime.setHours(targetHour, 0, 0, 0);
  
  // If the time has already passed today, move to tomorrow
  if (userLocalTime.getTime() <= now.getTime()) {
    userLocalTime.setDate(userLocalTime.getDate() + 1);
  }
  
  return userLocalTime.getTime();
}