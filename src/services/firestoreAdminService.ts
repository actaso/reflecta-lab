import { getFirestore } from 'firebase-admin/firestore';
import app from '@/lib/firebase-admin';
import { JournalEntry, UserAccount } from '@/types/journal';
import { userInsight } from '@/types/insights';
import { CoachingMessage } from '@/types/coachingMessage';

/**
 * Service for Firebase Admin SDK operations
 * Handles user accounts and journal entries retrieval
 */
export class FirestoreAdminService {
  private static db = app ? getFirestore(app) : null;
  
  // Collection names
  private static USERS_COLLECTION = 'users';
  private static JOURNAL_ENTRIES_COLLECTION = 'journal_entries';
  private static COACHING_MESSAGES_COLLECTION = 'coachingMessages';

  /**
   * Strip HTML tags/entities in a server-safe way and trim whitespace.
   */
  private static stripHtmlServer(html: unknown): string {
    if (typeof html !== 'string') return '';
    const withoutTags = html.replace(/<[^>]*>/g, ' ');
    const withoutNbsp = withoutTags.replace(/&nbsp;/g, ' ');
    const withoutEntities = withoutNbsp.replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>');
    return withoutEntities.trim();
  }

  /**
   * Determine whether a journal entry is effectively empty.
   * Empty means: no text after stripping HTML/entities and no images.
   */
  private static isEntryEmpty(entry: Partial<JournalEntry>): boolean {
    const text = this.stripHtmlServer(entry.content ?? '');
    const hasText = text.length > 0;
    const hasImages = Array.isArray(entry.images) && entry.images.length > 0;
    return !hasText && !hasImages;
  }

  /**
   * Get user account data with all fields
   */
  static async getUserAccount(userId: string): Promise<UserAccount | null> {
    if (!this.db) return null;
    
    try {
      const doc = await this.db.collection(this.USERS_COLLECTION).doc(userId).get();
      
      if (!doc.exists) {
        return null;
      }
      
      const data = doc.data()!;
      return {
        uid: data.uid,
        email: data.email || '',
        createdAt: data.createdAt?.toDate() || new Date(),
        updatedAt: data.updatedAt?.toDate() || new Date(),
        firstName: data.firstName || '',
        onboardingData: data.onboardingData || {
          onboardingCompleted: false,
          onboardingCompletedAt: 0,
          whatDoYouDoInLife: [],
          selfReflectionPracticesTried: [],
          clarityInLife: 0,
          stressInLife: 0,
        },
        coachingConfig: data.coachingConfig || {
          challengeDegree: 'moderate',
          harshToneDegree: 'supportive',
          coachingMessageFrequency: 'multipleTimesPerWeek',
          enableCoachingMessages: false,
          lastCoachingMessageSentAt: 0,
          coachingMessageTimePreference: 'morning',
        },
        mobilePushNotifications: data.mobilePushNotifications || {
          enabled: false,
          expoPushTokens: [],
          lastNotificationSentAt: 0,
        },
        userTimezone: data.userTimezone || 'America/New_York',
        nextCoachingMessageDue: data.nextCoachingMessageDue,
      };
    } catch (error) {
      console.error('Error fetching user account:', error);
      return null;
    }
  }

  /**
   * Get recent journal entries for a user
   */
  static async getRecentJournalEntries(userId: string, limit: number = 10): Promise<JournalEntry[]> {
    if (!this.db) return [];
    
    try {
      const query = this.db.collection('journal_entries')
        .where('uid', '==', userId)
        .orderBy('timestamp', 'desc')
        .limit(limit);
      
      const snapshot = await query.get();
      
      return snapshot.docs.map(doc => {
        const data = doc.data();
        return {
          id: doc.id,
          uid: data.uid,
          content: data.content,
          timestamp: data.timestamp?.toDate() || new Date(),
          lastUpdated: data.lastUpdated?.toDate() || data.updatedAt?.toDate() || new Date(),
          images: data.images || [],
          linkedCoachingSessionId: data.linkedCoachingSessionId,
          linkedCoachingMessageId: data.linkedCoachingMessageId
        };
      });
    } catch (error) {
      console.error('Error fetching recent entries:', error);
      return [];
    }
  }

  /**
   * Get recent non-empty journal entries for a user with paginated lookback.
   * Ensures up to desiredCount entries are returned, filtering out empty ones.
   */
  static async getRecentNonEmptyJournalEntries(
    userId: string,
    desiredCount: number = 10,
    pageSize: number = 50,
    maxLookback: number = 200
  ): Promise<JournalEntry[]> {
    if (!this.db) return [];

    const results: JournalEntry[] = [];
    let fetched = 0;
    let lastDoc: FirebaseFirestore.QueryDocumentSnapshot | null = null;

    try {
      while (results.length < desiredCount && fetched < maxLookback) {
        let queryRef = this.db
          .collection(this.JOURNAL_ENTRIES_COLLECTION)
          .where('uid', '==', userId)
          .orderBy('timestamp', 'desc')
          .limit(pageSize);

        if (lastDoc) {
          queryRef = queryRef.startAfter(lastDoc);
        }

        const snapshot = await queryRef.get();
        if (snapshot.empty) break;

        for (const doc of snapshot.docs) {
          fetched += 1;
          const data = doc.data();
          const candidate: JournalEntry = {
            id: doc.id,
            uid: data.uid,
            content: data.content,
            timestamp: data.timestamp?.toDate() || new Date(),
            lastUpdated: data.lastUpdated?.toDate() || data.updatedAt?.toDate() || new Date(),
            images: data.images || [],
            linkedCoachingSessionId: data.linkedCoachingSessionId,
            linkedCoachingMessageId: data.linkedCoachingMessageId
          };

          if (!this.isEntryEmpty(candidate)) {
            results.push(candidate);
            if (results.length >= desiredCount) break;
          }
        }

        lastDoc = snapshot.docs[snapshot.docs.length - 1];
      }

      return results.slice(0, desiredCount);
    } catch (error) {
      console.error('Error fetching recent non-empty entries:', error);
      return results.slice(0, desiredCount);
    }
  }

  /**
   * Get the latest journal entry for a user
   */
  static async getLatestJournalEntry(userId: string): Promise<JournalEntry | null> {
    if (!this.db) return null;

    try {
      const query = this.db.collection('journal_entries')
        .where('uid', '==', userId)
        .orderBy('timestamp', 'desc')
        .limit(1);

      const snapshot = await query.get();

      if (snapshot.empty) {
        return null;
      }

      const doc = snapshot.docs[0];
      const data = doc.data();
      return {
        id: doc.id,
        uid: data.uid,
        content: data.content,
        timestamp: data.timestamp?.toDate() || new Date(),
        lastUpdated: data.lastUpdated?.toDate() || data.updatedAt?.toDate() || new Date(),
        images: data.images || []
      };
    } catch (error) {
      console.error('Error fetching latest journal entry:', error);
      return null;
    }
  }

  /**
   * Get the total count of journal entries for a user
   */
  static async getUserEntryCount(userId: string): Promise<number> {
    if (!this.db) return 0;
    
    try {
      const query = this.db.collection('journal_entries')
        .where('uid', '==', userId);
      
      const snapshot = await query.get();
      return snapshot.size;
    } catch (error) {
      console.error('Error fetching user entry count:', error);
      return 0;
    }
  }

  /**
   * Get all users who have coaching messages enabled
   * Used by cron job to determine who to process
   * @deprecated Use getUsersDueForCoachingMessage() for better performance
   */
  static async getAllUsersWithCoachingEnabled(): Promise<UserAccount[]> {
    if (!this.db) return [];
    
    try {
      const query = this.db.collection('users')
        .where('coachingConfig.enableCoachingMessages', '==', true);
      
      const snapshot = await query.get();
      
      return snapshot.docs.map(doc => {
        const data = doc.data();
        return {
          uid: data.uid,
          email: data.email || '',
          createdAt: data.createdAt?.toDate() || new Date(),
          updatedAt: data.updatedAt?.toDate() || new Date(),
          firstName: data.firstName || '',
          onboardingData: data.onboardingData || {
            onboardingCompleted: false,
            onboardingCompletedAt: 0,
            whatDoYouDoInLife: [],
            selfReflectionPracticesTried: [],
            clarityInLife: 0,
            stressInLife: 0,
          },
          coachingConfig: data.coachingConfig || {
            challengeDegree: 'moderate',
            harshToneDegree: 'supportive',
            coachingMessageFrequency: 'multipleTimesPerWeek',
            enableCoachingMessages: false,
            lastCoachingMessageSentAt: 0,
            coachingMessageTimePreference: 'morning',
          },
          mobilePushNotifications: data.mobilePushNotifications || {
            enabled: false,
            expoPushTokens: [],
            lastNotificationSentAt: 0,
          },
          userTimezone: data.userTimezone || 'America/New_York',
          nextCoachingMessageDue: data.nextCoachingMessageDue,
        };
      });
    } catch (error) {
      console.error('Error fetching users with coaching enabled:', error);
      return [];
    }
  }

  /**
   * Get users who are due for coaching messages (optimized query)
   * Uses nextCoachingMessageDue field for efficient filtering
   */
  static async getUsersDueForCoachingMessage(): Promise<UserAccount[]> {
    if (!this.db) return [];
    
    try {
      const now = Date.now();
      
      // Query users where nextCoachingMessageDue <= now
      // This is much more efficient than checking all users
      const query = this.db.collection('users')
        .where('coachingConfig.enableCoachingMessages', '==', true)
        .where('nextCoachingMessageDue', '<=', now);
      
      const snapshot = await query.get();
      
      const dueUsers = snapshot.docs.map(doc => {
        const data = doc.data();
        return {
          uid: data.uid,
          email: data.email || '',
          createdAt: data.createdAt?.toDate() || new Date(),
          updatedAt: data.updatedAt?.toDate() || new Date(),
          firstName: data.firstName || '',
          onboardingData: data.onboardingData || {
            onboardingCompleted: false,
            onboardingCompletedAt: 0,
            whatDoYouDoInLife: [],
            selfReflectionPracticesTried: [],
            clarityInLife: 0,
            stressInLife: 0,
          },
          coachingConfig: data.coachingConfig || {
            challengeDegree: 'moderate',
            harshToneDegree: 'supportive',
            coachingMessageFrequency: 'multipleTimesPerWeek',
            enableCoachingMessages: false,
            lastCoachingMessageSentAt: 0,
            coachingMessageTimePreference: 'morning',
          },
          mobilePushNotifications: data.mobilePushNotifications || {
            enabled: false,
            expoPushTokens: [],
            lastNotificationSentAt: 0,
          },
          userTimezone: data.userTimezone || 'America/New_York',
          nextCoachingMessageDue: data.nextCoachingMessageDue,
        };
      });

      console.log(`📊 [FIRESTORE] Found ${dueUsers.length} users due for coaching messages`);
      return dueUsers;
      
    } catch (error) {
      console.error('Error fetching users due for coaching messages:', error);
      return [];
    }
  }

  /**
   * Get users who need nextCoachingMessageDue to be initialized
   * (Users with coaching enabled but no nextCoachingMessageDue set)
   */
  static async getUsersNeedingCoachingScheduleBootstrap(): Promise<UserAccount[]> {
    if (!this.db) return [];
    
    try {
      // Query users with coaching enabled but no nextCoachingMessageDue field
      const query = this.db.collection('users')
        .where('coachingConfig.enableCoachingMessages', '==', true)
        .where('nextCoachingMessageDue', '==', null);
      
      const snapshot = await query.get();
      
      const usersNeedingBootstrap = snapshot.docs.map(doc => {
        const data = doc.data();
        return {
          uid: data.uid,
          email: data.email || '',
          createdAt: data.createdAt?.toDate() || new Date(),
          updatedAt: data.updatedAt?.toDate() || new Date(),
          firstName: data.firstName || '',
          onboardingData: data.onboardingData || {
            onboardingCompleted: false,
            onboardingCompletedAt: 0,
            whatDoYouDoInLife: [],
            selfReflectionPracticesTried: [],
            clarityInLife: 0,
            stressInLife: 0,
          },
          coachingConfig: data.coachingConfig || {
            challengeDegree: 'moderate',
            harshToneDegree: 'supportive',
            coachingMessageFrequency: 'multipleTimesPerWeek',
            enableCoachingMessages: false,
            lastCoachingMessageSentAt: 0,
            coachingMessageTimePreference: 'morning',
          },
          mobilePushNotifications: data.mobilePushNotifications || {
            enabled: false,
            expoPushTokens: [],
            lastNotificationSentAt: 0,
          },
          userTimezone: data.userTimezone || 'America/New_York',
          nextCoachingMessageDue: data.nextCoachingMessageDue,
        };
      });

      console.log(`🔧 [FIRESTORE] Found ${usersNeedingBootstrap.length} users needing coaching schedule bootstrap`);
      return usersNeedingBootstrap;
      
    } catch (error) {
      console.error('Error fetching users needing coaching schedule bootstrap:', error);
      return [];
    }
  }

  /**
   * Get user insights from userInsights collection
   */
  static async getUserInsights(userId: string): Promise<userInsight | null> {
    if (!this.db) return null;
    
    try {
      const query = this.db.collection('userInsights')
        .where('userId', '==', userId)
        .orderBy('updatedAt', 'desc')
        .limit(1);
      
      const snapshot = await query.get();
      
      if (snapshot.empty) {
        return null;
      }
      
      const doc = snapshot.docs[0];
      const data = doc.data();
      return {
        mainFocus: data.mainFocus,
        keyBlockers: data.keyBlockers,
        plan: data.plan,
        userId: data.userId,
        createdAt: data.createdAt,
        updatedAt: data.updatedAt
      };
    } catch (error) {
      console.error('Error fetching user insights:', error);
      return null;
    }
  }

  /**
   * Update user's nextCoachingMessageDue timestamp
   */
  static async updateUserNextCoachingMessageDue(userId: string, nextDueTimestamp: number): Promise<void> {
    if (!this.db) return;
    
    try {
      await this.db.collection('users').doc(userId).update({
        nextCoachingMessageDue: nextDueTimestamp,
        'coachingConfig.lastCoachingMessageSentAt': Date.now()
      });
    } catch (error) {
      console.error('Error updating user next coaching message due:', error);
      throw error;
    }
  }



  /**
   * Create a new journal entry (for coaching messages)
   */
  static async createJournalEntry(userId: string, content: string): Promise<string> {
    if (!this.db) return '';
    
    try {
      const now = new Date();
      
      const entryData = {
        uid: userId,
        content: content,
        timestamp: now,
        lastUpdated: now,
        createdAt: now,
        updatedAt: now
      };

      const docRef = await this.db.collection('journal_entries').add(entryData);
      console.log(`✅ [FIRESTORE] Created journal entry ${docRef.id} for user ${userId}`);
      return docRef.id;
    } catch (error) {
      console.error('Error creating journal entry (admin):', error);
      throw new Error('Failed to create journal entry in Firestore');
    }
  }

  /**
   * Create a new journal entry with coaching message linking
   */
  static async createJournalEntryWithCoachingMessage(userId: string, content: string, coachingMessageId: string): Promise<string> {
    if (!this.db) return '';
    
    try {
      const now = new Date();
      
      const entryData = {
        uid: userId,
        content: content,
        timestamp: now,
        lastUpdated: now,
        createdAt: now,
        updatedAt: now,
        linkedCoachingMessageId: coachingMessageId
      };

      const docRef = await this.db.collection('journal_entries').add(entryData);
      console.log(`✅ [FIRESTORE] Created journal entry ${docRef.id} for user ${userId} linked to coaching message ${coachingMessageId}`);
      return docRef.id;
    } catch (error) {
      console.error('Error creating journal entry with coaching message:', error);
      throw new Error('Failed to create journal entry with coaching message in Firestore');
    }
  }

  /**
   * Save a coaching message attempt (whether sent or not)
   */
  static async saveCoachingMessage(coachingMessage: Omit<CoachingMessage, 'id' | 'createdAt' | 'updatedAt'>): Promise<string> {
    if (!this.db) return '';
    
    try {
      const now = Date.now();
      
      const messageData: Omit<CoachingMessage, 'id'> = {
        ...coachingMessage,
        createdAt: now,
        updatedAt: now
      };

      const docRef = await this.db.collection(this.COACHING_MESSAGES_COLLECTION).add(messageData);
      console.log(`✅ [FIRESTORE] Saved coaching message ${docRef.id} for user ${coachingMessage.uid}`);
      return docRef.id;
    } catch (error) {
      console.error('Error saving coaching message:', error);
      throw new Error('Failed to save coaching message to Firestore');
    }
  }

  /**
   * Update coaching message after journal entry creation
   */
  static async updateCoachingMessageJournalEntry(messageId: string, journalEntryId: string): Promise<void> {
    if (!this.db) return;
    
    try {
      await this.db.collection(this.COACHING_MESSAGES_COLLECTION).doc(messageId).update({
        journalEntryId: journalEntryId,
        wasSent: true,
        updatedAt: Date.now()
      });
      console.log(`✅ [FIRESTORE] Updated coaching message ${messageId} with journal entry ${journalEntryId}`);
    } catch (error) {
      console.error('Error updating coaching message:', error);
      throw new Error('Failed to update coaching message in Firestore');
    }
  }

  /**
   * Get coaching messages for a user (for analytics/debugging)
   */
  static async getUserCoachingMessages(userId: string, limit: number = 50): Promise<CoachingMessage[]> {
    if (!this.db) return [];
    
    try {
      const query = this.db.collection(this.COACHING_MESSAGES_COLLECTION)
        .where('uid', '==', userId)
        .orderBy('createdAt', 'desc')
        .limit(limit);
      
      const snapshot = await query.get();
      return snapshot.docs.map(doc => {
        const data = doc.data();
        return {
          id: doc.id,
          ...(data as Omit<CoachingMessage, 'id'>),
        } as CoachingMessage;
      });
    } catch (error) {
      console.error('Error fetching user coaching messages:', error);
      return [];
    }
  }

  /**
   * Get database instance for advanced queries (used by coaching routes)
   */
  static getAdminDatabase() {
    return this.db;
  }
}