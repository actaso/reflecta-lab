#!/usr/bin/env node

/**
 * Simple test script for coaching message system
 * 
 * Usage:
 *   node test-coaching.js list                    # List all eligible users
 *   node test-coaching.js status USER_ID          # Get user status
 *   node test-coaching.js test USER_ID            # Test message for user
 *   node test-coaching.js force USER_ID           # Force message (bypass checks)
 *   node test-coaching.js scheduler               # Test scheduler
 */

const API_BASE = 'http://localhost:3000';

async function main() {
  const [,, action, userId] = process.argv;

  if (!action) {
    console.log(`
🧪 Coaching Message Test Script

Usage:
  node test-coaching.js list                    # List all eligible users
  node test-coaching.js status USER_ID          # Get user status  
  node test-coaching.js test USER_ID            # Test message for user
  node test-coaching.js force USER_ID           # Force message (bypass checks)
  node test-coaching.js scheduler               # Test scheduler

Examples:
  node test-coaching.js list
  node test-coaching.js status abc123
  node test-coaching.js test abc123
  node test-coaching.js force abc123
  node test-coaching.js scheduler
    `);
    return;
  }

  try {
    switch (action) {
      case 'list':
        await listEligibleUsers();
        break;
      case 'status':
        if (!userId) throw new Error('USER_ID required for status command');
        await getUserStatus(userId);
        break;
      case 'test':
        if (!userId) throw new Error('USER_ID required for test command');
        await testUser(userId, false);
        break;
      case 'force':
        if (!userId) throw new Error('USER_ID required for force command');
        await testUser(userId, true);
        break;
      case 'scheduler':
        await testScheduler();
        break;
      default:
        throw new Error(`Unknown action: ${action}`);
    }
  } catch (error) {
    console.error('❌ Error:', error.message);
    process.exit(1);
  }
}

async function apiCall(endpoint, body) {
  const response = await fetch(`${API_BASE}/api/coaching/generateCoachingMessage/test`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body)
  });

  const data = await response.json();
  
  if (!response.ok) {
    throw new Error(data.error || `HTTP ${response.status}`);
  }
  
  return data;
}

async function listEligibleUsers() {
  console.log('📋 Listing eligible users...\n');
  
  const result = await apiCall('test', { action: 'list-eligible' });
  
  console.log(`Total users with coaching enabled: ${result.totalUsersWithCoaching}`);
  console.log(`Users due for messages: ${result.usersDue}`);
  console.log(`Users needing bootstrap: ${result.usersNeedingBootstrap}`);
  console.log(`Currently eligible: ${result.eligibleUsers.filter(u => u.isEligible).length}\n`);
  
  result.eligibleUsers.forEach(user => {
    const status = user.isEligible ? '✅' : '⏰';
    const category = user.category ? ` [${user.category}]` : '';
    console.log(`${status} ${user.firstName} (${user.userId})${category}`);
    console.log(`   Reason: ${user.reason}`);
    console.log(`   Frequency: ${user.frequency}, Time: ${user.timePreference}`);
    console.log(`   Last sent: ${user.lastMessageSent ? new Date(user.lastMessageSent).toLocaleString() : 'Never'}`);
    console.log('');
  });
}

async function getUserStatus(userId) {
  console.log(`👤 Getting status for user: ${userId}\n`);
  
  const result = await apiCall('test', { action: 'user-status', userId });
  
  console.log(`Name: ${result.userProfile.firstName}`);
  console.log(`Timezone: ${result.userProfile.timezone}`);
  console.log(`Coaching enabled: ${result.userProfile.coachingConfig.enableCoachingMessages}`);
  console.log(`Frequency: ${result.userProfile.coachingConfig.coachingMessageFrequency}`);
  console.log(`Time preference: ${result.userProfile.coachingConfig.coachingMessageTimePreference}`);
  console.log('');
  
  console.log(`Eligible: ${result.eligibility.isEligible ? '✅' : '❌'}`);
  console.log(`Reason: ${result.eligibility.reason}`);
  console.log('');
  
  console.log(`Journal entries: ${result.journalInfo.totalEntries}`);
  console.log(`Has latest entry: ${result.journalInfo.hasLatestEntry}`);
  console.log(`Has insights: ${result.hasInsights}`);
  console.log('');
  
  console.log(`Last message: ${result.lastMessage.formatted}`);
  console.log(`Next due: ${result.nextDue.formatted}`);
}

async function testUser(userId, bypassChecks) {
  const action = bypassChecks ? 'force' : 'test';
  console.log(`🧪 ${action === 'force' ? 'Force testing' : 'Testing'} user: ${userId}\n`);
  
  const result = await apiCall('test', { 
    action: 'test-user', 
    userId, 
    bypassChecks 
  });
  
  console.log(`Status: ${result.processorResult.success ? '✅ Success' : '❌ Failed'}`);
  
  if (result.processorResult.success) {
    console.log('Message generated and injected into journal!');
  } else {
    console.log(`Error: ${result.processorResult.error}`);
  }
  
  console.log(`\nBypass checks: ${bypassChecks}`);
  console.log(`Timestamp: ${result.timestamp}`);
}

async function testScheduler() {
  console.log('🕐 Testing scheduler...\n');
  
  const result = await apiCall('test', { action: 'test-scheduler' });
  
  console.log(`Scheduler status: ${result.schedulerResult.success ? '✅ Success' : '❌ Failed'}`);
  
  if (result.schedulerResult.success) {
    const stats = result.schedulerResult.results;
    console.log(`Total users: ${stats.totalUsers}`);
    console.log(`Eligible users: ${stats.eligibleUsers}`);
    console.log(`Jobs created: ${stats.jobsCreated}`);
    console.log(`Errors: ${stats.errors}`);
  } else {
    console.log(`Error: ${result.schedulerResult.error}`);
  }
  
  console.log(`\nTimestamp: ${result.timestamp}`);
}

// Run the script
if (require.main === module) {
  main().catch(console.error);
}

module.exports = { main, listEligibleUsers, getUserStatus, testUser, testScheduler };