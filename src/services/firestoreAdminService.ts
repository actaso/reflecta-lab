import { getFirestore } from 'firebase-admin/firestore';
import app from '@/lib/firebase-admin';
import { JournalEntry, UserAccount } from '@/types/journal';

/**
 * Service for Firebase Admin SDK operations
 * Handles user accounts and journal entries retrieval
 */
export class FirestoreAdminService {
  private static db = app ? getFirestore(app) : null;

  /**
   * Get user account data including alignment and morning guidance
   */
  static async getUserAccount(userId: string): Promise<UserAccount | null> {
    if (!this.db) return null;
    
    try {
      const doc = await this.db.collection('users').doc(userId).get();
      
      if (!doc.exists) {
        return null;
      }
      
      const data = doc.data()!;
      return {
        uid: data.uid,
        alignment: data.alignment,
        alignmentSetAt: data.alignmentSetAt?.toDate(),
        createdAt: data.createdAt?.toDate() || new Date(),
        updatedAt: data.updatedAt?.toDate() || new Date(),
        currentMorningGuidance: data.currentMorningGuidance ? {
          journalQuestion: data.currentMorningGuidance.journalQuestion,
          detailedMorningPrompt: data.currentMorningGuidance.detailedMorningPrompt,
          reasoning: data.currentMorningGuidance.reasoning,
          generatedAt: data.currentMorningGuidance.generatedAt?.toDate() || new Date(),
          usedAt: data.currentMorningGuidance.usedAt?.toDate()
        } : undefined
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
          images: data.images || []
        };
      });
    } catch (error) {
      console.error('Error fetching recent entries:', error);
      return [];
    }
  }
}