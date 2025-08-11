import { Expo, ExpoPushMessage, ExpoPushTicket, ExpoPushReceipt } from 'expo-server-sdk';
import { FirestoreAdminService } from './firestoreAdminService';
import { 
  PushNotificationResult, 
  PushNotificationPayload, 
  PushNotificationData 
} from '@/types/pushNotifications';

/**
 * Push Notification Service for Reflecta AI Coaching
 * 
 * This service handles sending push notifications via Expo Push Notification service.
 * It's designed to be used by the AI coaching system to notify users about new messages,
 * insights, or other important updates.
 * 
 * Features:
 * - Send notifications to individual users or multiple users
 * - Retrieve user push tokens from Firestore
 * - Handle notification delivery tracking
 * - Robust error handling and retry logic
 * - Update last notification timestamps
 */
export class PushNotificationService {
  private expo: Expo;
  private static instance: PushNotificationService | null = null;

  constructor() {
    // Initialize Expo SDK
    this.expo = new Expo({
      accessToken: process.env.EXPO_ACCESS_TOKEN,
      useFcmV1: false, // Set to true if using FCM v1 API
    });
  }

  /**
   * Get singleton instance
   */
  static getInstance(): PushNotificationService {
    if (!this.instance) {
      this.instance = new PushNotificationService();
    }
    return this.instance;
  }

  /**
   * Send push notification to a single user
   * @param userId - User ID to send notification to
   * @param payload - Notification content and options
   * @returns Promise<PushNotificationResult>
   */
  async sendNotificationToUser(
    userId: string,
    payload: PushNotificationPayload
  ): Promise<PushNotificationResult> {
    try {
      console.log(`📲 [PUSH-SERVICE] Sending notification to user ${userId}`);

      // Get user account to retrieve push tokens
      const userAccount = await FirestoreAdminService.getUserAccount(userId);
      
      if (!userAccount) {
        console.error(`❌ [PUSH-SERVICE] User ${userId} not found`);
        return {
          success: false,
          sentCount: 0,
          failedCount: 1,
          errors: ['User not found']
        };
      }

      // Check if user has push notifications enabled
      if (!userAccount.mobilePushNotifications?.enabled) {
        console.log(`🔇 [PUSH-SERVICE] Push notifications disabled for user ${userId}`);
        return {
          success: false,
          sentCount: 0,
          failedCount: 0,
          errors: ['Push notifications disabled for user']
        };
      }

      // Get push tokens
      const pushTokens = userAccount.mobilePushNotifications.expoPushTokens || [];
      
      if (pushTokens.length === 0) {
        console.log(`📱 [PUSH-SERVICE] No push tokens found for user ${userId}`);
        return {
          success: false,
          sentCount: 0,
          failedCount: 0,
          errors: ['No push tokens found for user']
        };
      }

      // Send notifications to all user's devices
      const result = await this.sendToTokens(pushTokens, payload);
      
      // Update last notification sent timestamp if any notifications succeeded
      if (result.sentCount > 0) {
        await this.updateLastNotificationTimestamp(userId);
      }

      console.log(`✅ [PUSH-SERVICE] Notification result for user ${userId}:`, {
        sent: result.sentCount,
        failed: result.failedCount
      });

      return result;

    } catch (error) {
      console.error(`❌ [PUSH-SERVICE] Error sending notification to user ${userId}:`, error);
      return {
        success: false,
        sentCount: 0,
        failedCount: 1,
        errors: [error instanceof Error ? error.message : 'Unknown error']
      };
    }
  }

  /**
   * Send push notifications to multiple users
   * @param userIds - Array of user IDs
   * @param payload - Notification content and options
   * @returns Promise<PushNotificationResult>
   */
  async sendNotificationToUsers(
    userIds: string[],
    payload: PushNotificationPayload
  ): Promise<PushNotificationResult> {
    console.log(`📲 [PUSH-SERVICE] Sending notifications to ${userIds.length} users`);

    const results = await Promise.allSettled(
      userIds.map(userId => this.sendNotificationToUser(userId, payload))
    );

    // Aggregate results
    let totalSent = 0;
    let totalFailed = 0;
    const allErrors: string[] = [];
    const allTicketIds: string[] = [];

    results.forEach((result, index) => {
      if (result.status === 'fulfilled') {
        totalSent += result.value.sentCount;
        totalFailed += result.value.failedCount;
        allErrors.push(...result.value.errors);
        if (result.value.ticketIds) {
          allTicketIds.push(...result.value.ticketIds);
        }
      } else {
        totalFailed++;
        allErrors.push(`Failed to process user ${userIds[index]}: ${result.reason}`);
      }
    });

    const finalResult: PushNotificationResult = {
      success: totalSent > 0,
      sentCount: totalSent,
      failedCount: totalFailed,
      errors: allErrors,
      ticketIds: allTicketIds.length > 0 ? allTicketIds : undefined
    };

    console.log(`✅ [PUSH-SERVICE] Bulk notification complete:`, {
      sent: totalSent,
      failed: totalFailed,
      errors: allErrors.length
    });

    return finalResult;
  }

  /**
   * Send coaching message notification specifically
   * @param userId - User ID to send to
   * @param coachingMessage - The coaching message content
   * @param messageType - Type of coaching message
   */
  async sendCoachingMessageNotification(
    userId: string,
    coachingMessage: string,
    messageType: string = 'coaching_message',
    coachingMessageId?: string,
    journalEntryId?: string
  ): Promise<PushNotificationResult> {
    const notificationData: PushNotificationData = {
      type: 'coaching_message',
      messageType,
      userId,
      timestamp: Date.now(),
      coachingMessageId,
      journalEntryId
    };

    const payload: PushNotificationPayload = {
      title: this.getCoachingNotificationTitle(messageType),
      body: coachingMessage,
      data: notificationData,
      sound: 'default',
      categoryId: 'coaching_message',
      channelId: 'coaching_notifications'
    };

    return this.sendNotificationToUser(userId, payload);
  }

  /**
   * Send notifications to specific push tokens
   * @param pushTokens - Array of Expo push tokens
   * @param payload - Notification payload
   * @returns Promise<PushNotificationResult>
   */
  private async sendToTokens(
    pushTokens: string[],
    payload: PushNotificationPayload
  ): Promise<PushNotificationResult> {
    try {
      // Filter valid tokens
      const validTokens = pushTokens.filter(token => Expo.isExpoPushToken(token));
      const invalidTokens = pushTokens.filter(token => !Expo.isExpoPushToken(token));

      if (invalidTokens.length > 0) {
        console.warn(`⚠️ [PUSH-SERVICE] Found ${invalidTokens.length} invalid push tokens:`, invalidTokens);
      }

      if (validTokens.length === 0) {
        return {
          success: false,
          sentCount: 0,
          failedCount: invalidTokens.length,
          errors: ['No valid push tokens found']
        };
      }

      // Build messages
      const messages: ExpoPushMessage[] = validTokens.map(token => ({
        to: token,
        title: payload.title,
        body: payload.body,
        data: payload.data,
        sound: payload.sound || 'default',
        badge: payload.badge,
        categoryId: payload.categoryId,
        channelId: payload.channelId,
      }));

      // Send notifications in chunks (Expo recommends max 100 per request)
      const chunks = this.expo.chunkPushNotifications(messages);
      const ticketIds: string[] = [];
      let sentCount = 0;
      let failedCount = invalidTokens.length;
      const errors: string[] = [];

      for (const chunk of chunks) {
        try {
          console.log(`📤 [PUSH-SERVICE] Sending chunk of ${chunk.length} notifications`);
          const tickets = await this.expo.sendPushNotificationsAsync(chunk);
          
          tickets.forEach((ticket: ExpoPushTicket, index: number) => {
            if (ticket.status === 'ok') {
              sentCount++;
              if (ticket.id) {
                ticketIds.push(ticket.id);
              }
            } else {
              failedCount++;
              console.error(`❌ [PUSH-SERVICE] Failed to send to ${chunk[index].to}:`, ticket.message);
              errors.push(`Failed to send to token: ${ticket.message}`);
            }
          });
        } catch (chunkError) {
          console.error('❌ [PUSH-SERVICE] Error sending chunk:', chunkError);
          failedCount += chunk.length;
          errors.push(`Chunk error: ${chunkError instanceof Error ? chunkError.message : 'Unknown error'}`);
        }
      }

      return {
        success: sentCount > 0,
        sentCount,
        failedCount,
        errors,
        ticketIds: ticketIds.length > 0 ? ticketIds : undefined
      };

    } catch (error) {
      console.error('❌ [PUSH-SERVICE] Error in sendToTokens:', error);
      return {
        success: false,
        sentCount: 0,
        failedCount: pushTokens.length,
        errors: [error instanceof Error ? error.message : 'Unknown error']
      };
    }
  }

  /**
   * Update user's last notification timestamp in Firestore
   */
  private async updateLastNotificationTimestamp(userId: string): Promise<void> {
    try {
      const db = FirestoreAdminService.getAdminDatabase();
      if (!db) return;

      await db.collection('users').doc(userId).update({
        'mobilePushNotifications.lastNotificationSentAt': Date.now(),
        updatedAt: new Date()
      });

      console.log(`🕒 [PUSH-SERVICE] Updated last notification timestamp for user ${userId}`);
    } catch (error) {
      console.error(`❌ [PUSH-SERVICE] Failed to update timestamp for user ${userId}:`, error);
    }
  }

  /**
   * Get notification title based on coaching message type
   */
  private getCoachingNotificationTitle(messageType: string): string {
    const titleMap: Record<string, string> = {
      check_in: '💭 Time for a check-in',
      encouragement: '💪 You\'ve got this!',
      challenge: '🎯 Ready for a challenge?',
      reminder: '🔔 Gentle reminder',
      alignment_reflection: '🧭 Reflection time',
      general_reflection: '📝 Let\'s reflect',
      personal_insight: '💡 Insight for you',
      relevant_lesson: '📚 Something to consider',
      coaching_message: '🌟 Message from your coach'
    };

    return titleMap[messageType] || '🌟 Message from your coach';
  }

  /**
   * Check and handle push receipt status (call this periodically)
   * @param ticketIds - Array of ticket IDs from previous sends
   */
  async checkPushReceipts(ticketIds: string[]): Promise<void> {
    try {
      if (!ticketIds || ticketIds.length === 0) return;

      console.log(`🔍 [PUSH-SERVICE] Checking receipts for ${ticketIds.length} tickets`);

      const receiptChunks = this.expo.chunkPushNotificationReceiptIds(ticketIds);
      
      for (const chunk of receiptChunks) {
        try {
          const receipts = await this.expo.getPushNotificationReceiptsAsync(chunk);
          
          Object.entries(receipts).forEach(([ticketId, receipt]) => {
            if (receipt.status === 'error') {
              console.error(`❌ [PUSH-SERVICE] Receipt error for ticket ${ticketId}:`, receipt.message);
              
              // Handle specific error types
              if (receipt.details && receipt.details.error) {
                switch (receipt.details.error) {
                  case 'DeviceNotRegistered':
                    console.log(`📱 [PUSH-SERVICE] Device no longer registered for ticket ${ticketId}`);
                    // TODO: Remove invalid token from user's profile
                    break;
                  case 'MessageTooBig':
                    console.log(`📏 [PUSH-SERVICE] Message too big for ticket ${ticketId}`);
                    break;
                  case 'MessageRateExceeded':
                    console.log(`🚦 [PUSH-SERVICE] Rate limit exceeded for ticket ${ticketId}`);
                    break;
                  default:
                    console.log(`❓ [PUSH-SERVICE] Unknown error for ticket ${ticketId}:`, receipt.details.error);
                }
              }
            } else if (receipt.status === 'ok') {
              console.log(`✅ [PUSH-SERVICE] Successfully delivered ticket ${ticketId}`);
            }
          });
        } catch (chunkError) {
          console.error('❌ [PUSH-SERVICE] Error checking receipt chunk:', chunkError);
        }
      }
    } catch (error) {
      console.error('❌ [PUSH-SERVICE] Error checking push receipts:', error);
    }
  }
}

// Export singleton instance
export const pushNotificationService = PushNotificationService.getInstance();
