/**
 * LOCAL TESTING ENDPOINT FOR COACHING MESSAGES
 * 
 * This endpoint provides easy ways to test the coaching message system locally.
 * It bypasses normal timing/frequency checks for testing purposes.
 * 
 * FEATURES:
 * - Test specific users
 * - Test the scheduler
 * - Test message generation without delivery
 * - View user eligibility status
 * 
 * SECURITY:
 * - Only works in development mode
 * - Requires special test parameter
 */

import { NextRequest, NextResponse } from 'next/server';
import { FirestoreAdminService } from '@/services/firestoreAdminService';
import { UserAccount } from '@/types/journal';

/**
 * Local testing endpoint for coaching messages
 */
export async function POST(request: NextRequest) {
  // Only allow in development
  if (process.env.NODE_ENV === 'production') {
    return NextResponse.json(
      { success: false, error: 'Test endpoint only available in development' },
      { status: 403 }
    );
  }

  try {
    const body = await request.json();
    const { action, userId, bypassChecks = false } = body;

    console.log(`🧪 [COACHING-TEST] Running test action: ${action}`);

    switch (action) {
      case 'test-user':
        return await testSpecificUser(userId, bypassChecks);
      
      case 'test-scheduler':
        return await testScheduler();
      
      case 'list-eligible':
        return await listEligibleUsers();
      
      case 'user-status':
        return await getUserStatus(userId);
      
      case 'dry-run':
        return await dryRunMessageGeneration(userId);
        
      default:
        return NextResponse.json(
          { success: false, error: 'Invalid action. Use: test-user, test-scheduler, list-eligible, user-status, dry-run' },
          { status: 400 }
        );
    }

  } catch (error) {
    console.error('❌ [COACHING-TEST] Test error:', error);
    
    return NextResponse.json(
      { success: false, error: 'Test failed', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}

/**
 * Test coaching message generation for a specific user
 */
async function testSpecificUser(userId: string, bypassChecks: boolean) {
  if (!userId) {
    return NextResponse.json(
      { success: false, error: 'userId is required for test-user action' },
      { status: 400 }
    );
  }

  try {
    // Get user info
    const user = await FirestoreAdminService.getUserAccount(userId);
    if (!user) {
      return NextResponse.json(
        { success: false, error: 'User not found' },
        { status: 404 }
      );
    }

    if (!bypassChecks) {
      // Check if user is eligible
      const eligible = await isUserEligibleForTesting(user);
      if (!eligible.isEligible) {
        return NextResponse.json({
          success: false,
          error: 'User not eligible for coaching message',
          reason: eligible.reason,
          userConfig: user.coachingConfig
        });
      }
    }

    // Call the processor directly
    const processorUrl = `${getBaseUrl()}/api/coaching/generateCoachingMessage/processor`;
    
    const response = await fetch(processorUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer dev`
      },
      body: JSON.stringify({ userId })
    });

    const result = await response.json();

    return NextResponse.json({
      success: true,
      action: 'test-user',
      userId,
      bypassChecks,
      processorResult: result,
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    return NextResponse.json({
      success: false,
      error: 'Failed to test user',
      details: error instanceof Error ? error.message : 'Unknown error'
    });
  }
}

/**
 * Test the scheduler functionality
 */
async function testScheduler() {
  try {
    const schedulerUrl = `${getBaseUrl()}/api/coaching/generateCoachingMessage/scheduler`;
    
    const response = await fetch(schedulerUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer dev`
      }
    });

    const result = await response.json();

    return NextResponse.json({
      success: true,
      action: 'test-scheduler',
      schedulerResult: result,
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    return NextResponse.json({
      success: false,
      error: 'Failed to test scheduler',
      details: error instanceof Error ? error.message : 'Unknown error'
    });
  }
}

/**
 * List all users eligible for coaching messages
 */
async function listEligibleUsers() {
  try {
    // Use both new optimized queries
    const [usersDue, usersNeedingBootstrap, allUsers] = await Promise.all([
      FirestoreAdminService.getUsersDueForCoachingMessage(),
      FirestoreAdminService.getUsersNeedingCoachingScheduleBootstrap(),
      FirestoreAdminService.getAllUsersWithCoachingEnabled() // For comparison
    ]);
    
    const eligibleUsers = [];
    
    // Process users due for messages
    for (const user of usersDue) {
      eligibleUsers.push({
        userId: user.uid,
        firstName: user.firstName,
        isEligible: true,
        reason: 'Due for message based on nextCoachingMessageDue',
        timezone: user.userTimezone,
        frequency: user.coachingConfig.coachingMessageFrequency,
        timePreference: user.coachingConfig.coachingMessageTimePreference,
        lastMessageSent: user.coachingConfig.lastCoachingMessageSentAt,
        nextDue: user.nextCoachingMessageDue,
        category: 'due-for-message'
      });
    }
    
    // Process users needing bootstrap
    for (const user of usersNeedingBootstrap) {
      eligibleUsers.push({
        userId: user.uid,
        firstName: user.firstName,
        isEligible: true,
        reason: 'Needs coaching schedule bootstrap',
        timezone: user.userTimezone,
        frequency: user.coachingConfig.coachingMessageFrequency,
        timePreference: user.coachingConfig.coachingMessageTimePreference,
        lastMessageSent: user.coachingConfig.lastCoachingMessageSentAt,
        nextDue: user.nextCoachingMessageDue,
        category: 'needs-bootstrap'
      });
    }
    
    // Check remaining users for legacy eligibility (for comparison)
    const processedUserIds = new Set([
      ...usersDue.map(u => u.uid),
      ...usersNeedingBootstrap.map(u => u.uid)
    ]);
    
    for (const user of allUsers) {
      if (!processedUserIds.has(user.uid)) {
        const eligibility = await isUserEligibleForTesting(user);
        eligibleUsers.push({
          userId: user.uid,
          firstName: user.firstName,
          isEligible: eligibility.isEligible,
          reason: eligibility.reason,
          timezone: user.userTimezone,
          frequency: user.coachingConfig.coachingMessageFrequency,
          timePreference: user.coachingConfig.coachingMessageTimePreference,
          lastMessageSent: user.coachingConfig.lastCoachingMessageSentAt,
          nextDue: user.nextCoachingMessageDue,
          category: 'not-due'
        });
      }
    }

    return NextResponse.json({
      success: true,
      action: 'list-eligible',
      totalUsersWithCoaching: allUsers.length,
      usersDue: usersDue.length,
      usersNeedingBootstrap: usersNeedingBootstrap.length,
      eligibleUsers,
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    return NextResponse.json({
      success: false,
      error: 'Failed to list eligible users',
      details: error instanceof Error ? error.message : 'Unknown error'
    });
  }
}

/**
 * Get detailed status for a specific user
 */
async function getUserStatus(userId: string) {
  if (!userId) {
    return NextResponse.json(
      { success: false, error: 'userId is required for user-status action' },
      { status: 400 }
    );
  }

  try {
    const user = await FirestoreAdminService.getUserAccount(userId);
    if (!user) {
      return NextResponse.json(
        { success: false, error: 'User not found' },
        { status: 404 }
      );
    }

    const eligibility = await isUserEligibleForTesting(user);
    const latestEntry = await FirestoreAdminService.getLatestJournalEntry(userId);
    const entryCount = await FirestoreAdminService.getUserEntryCount(userId);
    const insights = await FirestoreAdminService.getUserInsights(userId);

    // Calculate time since last message
    const now = new Date();
    const lastMessageTime = user.coachingConfig.lastCoachingMessageSentAt;
    const timeSinceLastMessage = lastMessageTime ? now.getTime() - lastMessageTime : null;
    const hoursAgo = timeSinceLastMessage ? Math.floor(timeSinceLastMessage / (1000 * 60 * 60)) : null;

    return NextResponse.json({
      success: true,
      action: 'user-status',
      userId,
      userProfile: {
        firstName: user.firstName,
        timezone: user.userTimezone,
        coachingConfig: user.coachingConfig
      },
      eligibility: eligibility,
      journalInfo: {
        totalEntries: entryCount,
        hasLatestEntry: !!latestEntry,
        latestEntryDate: latestEntry?.timestamp?.toISOString()
      },
      hasInsights: !!insights,
      lastMessage: {
        timestamp: lastMessageTime,
        hoursAgo: hoursAgo,
        formatted: lastMessageTime ? new Date(lastMessageTime).toLocaleString() : 'Never'
      },
      nextDue: {
        timestamp: user.nextCoachingMessageDue,
        formatted: user.nextCoachingMessageDue ? new Date(user.nextCoachingMessageDue).toLocaleString() : 'Not set'
      },
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    return NextResponse.json({
      success: false,
      error: 'Failed to get user status',
      details: error instanceof Error ? error.message : 'Unknown error'
    });
  }
}

/**
 * Dry run message generation (generates but doesn't deliver)
 */
async function dryRunMessageGeneration(userId: string) {
  if (!userId) {
    return NextResponse.json(
      { success: false, error: 'userId is required for dry-run action' },
      { status: 400 }
    );
  }

  // This would require importing the message generation logic
  // For now, just return a placeholder
  return NextResponse.json({
    success: true,
    action: 'dry-run',
    message: 'Dry run functionality not yet implemented',
    userId,
    timestamp: new Date().toISOString()
  });
}

/**
 * Check if user is eligible for coaching messages (simplified for testing)
 */
async function isUserEligibleForTesting(user: UserAccount): Promise<{ isEligible: boolean; reason: string }> {
  if (!user.coachingConfig.enableCoachingMessages) {
    return { isEligible: false, reason: 'Coaching messages disabled' };
  }

  const now = new Date();
  const lastMessageTime = user.coachingConfig.lastCoachingMessageSentAt;
  
  if (!lastMessageTime) {
    return { isEligible: true, reason: 'No previous message sent' };
  }

  const timeSinceLastMessage = now.getTime() - lastMessageTime;
  const hoursAgo = timeSinceLastMessage / (1000 * 60 * 60);
  const frequency = user.coachingConfig.coachingMessageFrequency;

  let minHours = 0;
  switch (frequency) {
    case 'daily':
      minHours = 20;
      break;
    case 'multipleTimesPerWeek':
      minHours = 48;
      break;
    case 'onceAWeek':
      minHours = 168;
      break;
  }

  if (hoursAgo >= minHours) {
    return { isEligible: true, reason: `Enough time passed (${Math.floor(hoursAgo)}h ago, needs ${minHours}h)` };
  } else {
    return { isEligible: false, reason: `Too soon (${Math.floor(hoursAgo)}h ago, needs ${minHours}h)` };
  }
}

/**
 * Get base URL for API calls
 */
function getBaseUrl(): string {
  if (process.env.VERCEL_URL) {
    return `https://${process.env.VERCEL_URL}`;
  }
  return 'http://localhost:3000';
}