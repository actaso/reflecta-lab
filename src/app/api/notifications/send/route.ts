import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { getFirestore } from 'firebase-admin/firestore';
import app from '@/lib/firebase-admin';
import { Expo, ExpoPushMessage, ExpoPushTicket } from 'expo-server-sdk';

/**
 * AI Notification System API Route
 * Allows the AI coaching system to send push notifications to users
 * 
 * This endpoint is designed to be called by:
 * - AI coaching system for reflection prompts
 * - Scheduled tasks for daily/weekly check-ins
 * - Progress milestone notifications
 * - System-generated coaching reminders
 */
export async function POST(request: NextRequest) {
  try {
    // Authentication check - ensure this is a legitimate system request
    const { userId } = await auth.protect();
    if (!userId) {
      return NextResponse.json(
        { success: false, error: 'Authentication required for notification system' },
        { status: 401 }
      );
    }

    // Firebase Admin check
    if (!app) {
      return NextResponse.json(
        { success: false, error: 'Firebase Admin SDK not initialized' },
        { status: 500 }
      );
    }

    const db = getFirestore(app);
    const body = await request.json();

    // Validate request body for AI notification
    const { 
      targetUserId, 
      notificationType,
      title, 
      body: notificationBody, 
      data = {},
      scheduledFor = 'immediate',
      priority = 'normal'
    } = body;

    // Validation
    if (!targetUserId || !title || !notificationBody) {
      return NextResponse.json(
        { success: false, error: 'Missing required fields: targetUserId, title, body' },
        { status: 400 }
      );
    }

    if (!notificationType) {
      return NextResponse.json(
        { success: false, error: 'notificationType is required (e.g., "reflection", "checkin", "milestone")' },
        { status: 400 }
      );
    }

    // Get user's push tokens from Firestore
    const userDoc = await db.collection('users').doc(targetUserId).get();
    
    if (!userDoc.exists) {
      return NextResponse.json(
        { success: false, error: `User ${targetUserId} not found` },
        { status: 404 }
      );
    }

    const userData = userDoc.data();
    const expoPushTokens = userData?.mobilePushNotifications?.expoPushTokens || [];

    if (expoPushTokens.length === 0) {
      console.log(`⚠️ No push tokens found for user ${targetUserId}`);
      return NextResponse.json(
        { success: false, error: 'User has no registered devices for notifications' },
        { status: 404 }
      );
    }

    // Log AI notification attempt
    console.log(`🤖 AI Notification Request:`, {
      type: notificationType,
      targetUser: targetUserId,
      title,
      body: notificationBody,
      tokenCount: expoPushTokens.length,
      priority,
      scheduledFor
    });

    // Store notification record in Firestore for tracking
    const notificationRecord = {
      targetUserId,
      notificationType,
      title,
      body: notificationBody,
      data,
      expoPushTokens,
      priority,
      scheduledFor,
      status: 'ready',
      createdAt: new Date(),
      createdBy: 'ai-system',
      sentAt: null,
      deliveryResults: null
    };

    const notificationRef = await db.collection('notifications').add(notificationRecord);
    
    // For immediate notifications, send them now
    if (scheduledFor === 'immediate') {
      console.log(`📱 Sending immediate notification to ${expoPushTokens.length} devices`);
      
      const expo = new Expo();

      // Filter valid push tokens
      const validTokens = expoPushTokens.filter((token: string) => 
        Expo.isExpoPushToken(token)
      );

      if (validTokens.length === 0) {
        await notificationRef.update({
          status: 'failed',
          failureReason: 'No valid push tokens found',
          processedAt: new Date()
        });
        
        return NextResponse.json(
          { success: false, error: 'No valid push tokens found' },
          { status: 400 }
        );
      }

      // Prepare push messages
      const messages: ExpoPushMessage[] = validTokens.map((token: string) => ({
        to: token,
        title,
        body: notificationBody,
        data: { ...data, notificationType, notificationId: notificationRef.id },
        sound: 'default',
        priority,
        channelId: 'default'
      }));

      // Send notifications
      const chunks = expo.chunkPushNotifications(messages);
      const tickets: ExpoPushTicket[] = [];

      for (const chunk of chunks) {
        try {
          const ticketChunk = await expo.sendPushNotificationsAsync(chunk);
          tickets.push(...ticketChunk);
        } catch (error) {
          console.error('Error sending push notification chunk:', error);
        }
      }

      // Log results
      const successCount = tickets.filter(ticket => ticket.status === 'ok').length;
      const errorCount = tickets.filter(ticket => ticket.status === 'error').length;

      console.log(`✅ Push notifications sent - Success: ${successCount}, Errors: ${errorCount}`);

      // Update notification record with results
      await notificationRef.update({
        status: 'sent',
        sentAt: new Date(),
        deliveryResults: {
          totalSent: validTokens.length,
          successCount,
          errorCount,
          tickets
        }
      });
    } else {
      // For scheduled notifications, just mark as scheduled
      await notificationRef.update({
        status: 'scheduled',
        processedAt: new Date()
      });
    }

    return NextResponse.json({
      success: true,
      message: `AI notification ${scheduledFor === 'immediate' ? 'sent' : 'scheduled'} for user ${targetUserId}`,
      notificationId: notificationRef.id,
      details: {
        targetUserId,
        notificationType,
        title,
        deviceCount: expoPushTokens.length,
        scheduledFor,
        status: scheduledFor === 'immediate' ? 'sent' : 'scheduled'
      }
    });

  } catch (error) {
    console.error('AI Notification API error:', error);
    return NextResponse.json(
      { 
        success: false, 
        error: 'Internal server error',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}

/**
 * Get Notification Status API Route
 * Check the status of sent notifications for debugging/monitoring
 */
export async function GET(request: NextRequest) {
  try {
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json(
        { success: false, error: 'Authentication required' },
        { status: 401 }
      );
    }

    if (!app) {
      return NextResponse.json(
        { success: false, error: 'Firebase Admin SDK not initialized' },
        { status: 500 }
      );
    }

    const db = getFirestore(app);
    const { searchParams } = new URL(request.url);
    const targetUserId = searchParams.get('userId');
    const notificationId = searchParams.get('notificationId');
    const limit = parseInt(searchParams.get('limit') || '10');

    if (notificationId) {
      // Get specific notification
      const notificationDoc = await db.collection('notifications').doc(notificationId).get();
      
      if (!notificationDoc.exists) {
        return NextResponse.json(
          { success: false, error: 'Notification not found' },
          { status: 404 }
        );
      }

      return NextResponse.json({
        success: true,
        notification: { id: notificationDoc.id, ...notificationDoc.data() }
      });
    }

    if (targetUserId) {
      // Get user's recent notifications
      const notificationsQuery = await db
        .collection('notifications')
        .where('targetUserId', '==', targetUserId)
        .orderBy('createdAt', 'desc')
        .limit(limit)
        .get();

      const notifications = notificationsQuery.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));

      return NextResponse.json({
        success: true,
        notifications,
        count: notifications.length
      });
    }

    // Get recent system notifications
    const recentNotificationsQuery = await db
      .collection('notifications')
      .orderBy('createdAt', 'desc')
      .limit(limit)
      .get();

    const recentNotifications = recentNotificationsQuery.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    }));

    return NextResponse.json({
      success: true,
      recentNotifications,
      count: recentNotifications.length
    });

  } catch (error) {
    console.error('Get notifications API error:', error);
    return NextResponse.json(
      { 
        success: false, 
        error: 'Internal server error',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
} 