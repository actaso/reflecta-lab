import { getFirestore } from 'firebase-admin/firestore';
import app from './firebase-admin';
import { UserAccount, JournalEntry } from '@/types/journal';
import { generateDefaultUserAccount, DEFAULT_USER_ACCOUNT_FIELDS } from './userAccountDefaults';

class FirestoreAdminService {
  private static USERS_COLLECTION_NAME = 'users';
  private static JOURNAL_ENTRIES_COLLECTION_NAME = 'journal_entries';

  // Get admin firestore instance
  private static getAdminDb() {
    if (!app) {
      throw new Error('Firebase Admin SDK not initialized');
    }
    
    return getFirestore(app);
  }

  // Public method to access admin database for custom operations
  static getAdminDatabase() {
    return this.getAdminDb();
  }

  // Get user account using Admin SDK (for server-side operations)
  static async getUserAccount(userId: string): Promise<UserAccount> {
    try {
      const adminDb = this.getAdminDb();
      const docRef = adminDb.collection(this.USERS_COLLECTION_NAME).doc(userId);
      const docSnap = await docRef.get();
      
      if (docSnap.exists) {
        const data = docSnap.data()!;
        

        
        return {
          uid: data.uid,
          email: data.email || DEFAULT_USER_ACCOUNT_FIELDS.email,
          createdAt: data.createdAt ? data.createdAt.toDate() : data.updatedAt.toDate(),
          updatedAt: data.updatedAt.toDate(),
          firstName: data.firstName || DEFAULT_USER_ACCOUNT_FIELDS.firstName,
          onboardingData: data.onboardingData || DEFAULT_USER_ACCOUNT_FIELDS.onboardingData,
          coachingConfig: data.coachingConfig || DEFAULT_USER_ACCOUNT_FIELDS.coachingConfig,
          mobilePushNotifications: data.mobilePushNotifications || DEFAULT_USER_ACCOUNT_FIELDS.mobilePushNotifications,
          userTimezone: data.userTimezone || DEFAULT_USER_ACCOUNT_FIELDS.userTimezone,
          nextCoachingMessageDue: data.nextCoachingMessageDue || DEFAULT_USER_ACCOUNT_FIELDS.nextCoachingMessageDue,
        };
      } else {
        // Create new user account using Admin SDK with intelligent defaults
        const newUserData = generateDefaultUserAccount(userId, '');
        
        await docRef.set(newUserData);
        return newUserData;
      }
    } catch (error) {
      console.error('Error getting user account (admin):', error);
      throw new Error('Failed to get user account from Firestore');
    }
  }











  // Get user's journal entries using Admin SDK (for server-side operations)
  static async getUserEntries(userId: string): Promise<JournalEntry[]> {
    try {
      const adminDb = this.getAdminDb();
      const querySnapshot = await adminDb
        .collection(this.JOURNAL_ENTRIES_COLLECTION_NAME)
        .where('uid', '==', userId)
        .orderBy('timestamp', 'desc')
        .get();
      
      return querySnapshot.docs.map(doc => {
        const data = doc.data();
        return {
          id: doc.id,
          uid: data.uid,
          content: data.content,
          timestamp: data.timestamp.toDate(),
          lastUpdated: data.lastUpdated ? data.lastUpdated.toDate() : data.updatedAt.toDate(),
          images: data.images || [],
          linkedCoachingSessionId: data.linkedCoachingSessionId
        };
      });
    } catch (error) {
      console.error('Error fetching user entries (admin):', error);
      throw new Error('Failed to fetch entries from Firestore');
    }
  }
}

export default FirestoreAdminService;