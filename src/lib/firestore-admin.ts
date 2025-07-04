import { getFirestore } from 'firebase-admin/firestore';
import app from './firebase-admin';
import { UserAccount, JournalEntry } from '@/types/journal';

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
          lastMorningGuidanceGenerated: data.lastMorningGuidanceGenerated ? data.lastMorningGuidanceGenerated.toDate() : undefined,
          createdAt: data.createdAt ? data.createdAt.toDate() : data.updatedAt.toDate(),
          updatedAt: data.updatedAt.toDate()
        };
      } else {
        // Create new user account using Admin SDK
        const now = new Date();
        const newUserData = {
          uid: userId,
          createdAt: now,
          updatedAt: now
        };
        
        await docRef.set(newUserData);
        return newUserData;
      }
    } catch (error) {
      console.error('Error getting user account (admin):', error);
      throw new Error('Failed to get user account from Firestore');
    }
  }

  // Update last morning guidance generated using Admin SDK
  static async updateLastMorningGuidanceGenerated(userId: string): Promise<void> {
    try {
      const adminDb = this.getAdminDb();
      const docRef = adminDb.collection(this.USERS_COLLECTION_NAME).doc(userId);
      await docRef.update({
        lastMorningGuidanceGenerated: new Date(),
        updatedAt: new Date()
      });
    } catch (error) {
      console.error('Error updating last morning guidance generated (admin):', error);
      throw new Error('Failed to update last morning guidance generated');
    }
  }

  // Check if user needs new morning guidance using Admin SDK
  static async shouldGenerateNewMorningGuidance(userId: string): Promise<boolean> {
    try {
      const userAccount = await this.getUserAccount(userId);

      if (!userAccount.lastMorningGuidanceGenerated) {
        return true;
      }

      const lastGenerated = userAccount.lastMorningGuidanceGenerated;
      const today = new Date();
      
      // Check if it's a different day
      const isDifferentDay = lastGenerated.toDateString() !== today.toDateString();
      
      return isDifferentDay;
    } catch (error) {
      console.error('Error checking if should generate new morning guidance (admin):', error);
      return false;
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
          lastUpdated: data.lastUpdated ? data.lastUpdated.toDate() : data.updatedAt.toDate()
        };
      });
    } catch (error) {
      console.error('Error fetching user entries (admin):', error);
      throw new Error('Failed to fetch entries from Firestore');
    }
  }
}

export default FirestoreAdminService;