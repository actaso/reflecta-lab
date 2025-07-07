import { getFirestore } from 'firebase-admin/firestore';
import app from './firebase-admin';
import { UserAccount, JournalEntry, MorningGuidance } from '@/types/journal';

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
        
        // Convert morning guidance if it exists
        let currentMorningGuidance: MorningGuidance | undefined = undefined;
        if (data.currentMorningGuidance) {
          currentMorningGuidance = {
            journalQuestion: data.currentMorningGuidance.journalQuestion,
            detailedMorningPrompt: data.currentMorningGuidance.detailedMorningPrompt,
            reasoning: data.currentMorningGuidance.reasoning,
            generatedAt: data.currentMorningGuidance.generatedAt.toDate()
          };
        }
        
        return {
          uid: data.uid,
          lastMorningGuidanceGenerated: data.lastMorningGuidanceGenerated ? data.lastMorningGuidanceGenerated.toDate() : undefined,
          currentMorningGuidance,
          alignment: data.alignment,
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

      // Check if we have current guidance for today
      if (userAccount.currentMorningGuidance) {
        const today = new Date().toISOString().split('T')[0];
        const guidanceDate = userAccount.currentMorningGuidance.generatedAt.toISOString().split('T')[0];
        if (guidanceDate === today) {
          return false; // Already have guidance for today
        }
      }

      // If no guidance or it's from a different day, generate new one
      return true;
    } catch (error) {
      console.error('Error checking if should generate new morning guidance (admin):', error);
      return false;
    }
  }

  // Save morning guidance to user account using Admin SDK
  static async saveMorningGuidance(userId: string, guidance: Omit<MorningGuidance, 'generatedAt'>): Promise<void> {
    try {
      const adminDb = this.getAdminDb();
      const now = new Date();
      
      const docRef = adminDb.collection(this.USERS_COLLECTION_NAME).doc(userId);
      await docRef.update({
        currentMorningGuidance: {
          journalQuestion: guidance.journalQuestion,
          detailedMorningPrompt: guidance.detailedMorningPrompt,
          reasoning: guidance.reasoning,
          generatedAt: now
        },
        lastMorningGuidanceGenerated: now,
        updatedAt: now
      });
    } catch (error) {
      console.error('Error saving morning guidance (admin):', error);
      throw new Error('Failed to save morning guidance to Firestore');
    }
  }

  // Get current morning guidance for today using Admin SDK
  static async getCurrentMorningGuidance(userId: string): Promise<MorningGuidance | null> {
    try {
      const userAccount = await this.getUserAccount(userId);
      
      if (userAccount.currentMorningGuidance) {
        const today = new Date().toISOString().split('T')[0];
        const guidanceDate = userAccount.currentMorningGuidance.generatedAt.toISOString().split('T')[0];
        if (guidanceDate === today) {
          return userAccount.currentMorningGuidance;
        }
      }
      
      return null;
    } catch (error) {
      console.error('Error getting current morning guidance (admin):', error);
      return null;
    }
  }

  // Save user alignment using Admin SDK
  static async saveAlignment(userId: string, alignment: string): Promise<void> {
    try {
      const adminDb = this.getAdminDb();
      const docRef = adminDb.collection(this.USERS_COLLECTION_NAME).doc(userId);
      await docRef.update({
        alignment,
        updatedAt: new Date()
      });
    } catch (error) {
      console.error('Error saving alignment (admin):', error);
      throw new Error('Failed to save alignment to Firestore');
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