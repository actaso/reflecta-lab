// Push notification related types for the Reflecta app

export interface PushNotificationData extends Record<string, unknown> {
  type: 'coaching_message' | 'reminder' | 'insight' | 'general';
  messageType?: string;
  userId: string;
  timestamp: number;
  journalEntryId?: string;
  coachingMessageId?: string;
}

export interface PushNotificationPayload {
  title: string;
  body: string;
  data?: PushNotificationData;
  sound?: 'default' | null;
  badge?: number;
  categoryId?: string;
  channelId?: string;
}

export interface PushNotificationResult {
  success: boolean;
  sentCount: number;
  failedCount: number;
  errors: string[];
  ticketIds?: string[];
}

// Expo push token validation
export type ExpoPushToken = string;

// Push notification preferences (extends UserAccount mobilePushNotifications)
export interface MobilePushNotificationSettings {
  enabled: boolean;
  expoPushTokens: ExpoPushToken[];
  lastNotificationSentAt: number;
  preferences?: {
    coachingMessages: boolean;
    reminders: boolean;
    insights: boolean;
    quietHours?: {
      start: string; // HH:MM format
      end: string;   // HH:MM format
    };
  };
}
