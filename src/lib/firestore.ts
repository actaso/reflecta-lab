import { 
  collection, 
  doc, 
  getDocs, 
  addDoc, 
  updateDoc, 
  deleteDoc, 
  query, 
  where, 
  orderBy, 
  onSnapshot,
  serverTimestamp,
  Timestamp,
  WriteBatch,
  writeBatch
} from 'firebase/firestore';
import { db } from './firebase';
import { JournalEntry } from '@/types/journal';

// Firestore document interface (includes Firestore metadata)
export interface FirestoreJournalEntry {
  id?: string;
  userId: string;
  content: string;
  timestamp: Timestamp;
  createdAt: Timestamp;
  updatedAt: Timestamp;
}

// Convert Firestore document to JournalEntry
const convertFirestoreEntry = (doc: { id: string; data: () => { content: string; timestamp: { toDate: () => Date } } }): JournalEntry => ({
  id: doc.id,
  content: doc.data().content,
  timestamp: doc.data().timestamp.toDate()
});

// Convert JournalEntry to Firestore document data
const convertToFirestoreData = (entry: Partial<JournalEntry>, userId: string): Partial<FirestoreJournalEntry> => ({
  userId,
  content: entry.content,
  timestamp: entry.timestamp ? Timestamp.fromDate(entry.timestamp) : serverTimestamp(),
  updatedAt: serverTimestamp(),
  ...(entry.id ? {} : { createdAt: serverTimestamp() })
});

export class FirestoreService {
  private static COLLECTION_NAME = 'journal_entries';

  // Get all entries for a user
  static async getUserEntries(userId: string): Promise<JournalEntry[]> {
    try {
      const q = query(
        collection(db, this.COLLECTION_NAME),
        where('userId', '==', userId),
        orderBy('timestamp', 'desc')
      );
      
      const querySnapshot = await getDocs(q);
      return querySnapshot.docs.map(convertFirestoreEntry);
    } catch (error) {
      console.error('Error fetching user entries:', error);
      throw new Error('Failed to fetch entries from Firestore');
    }
  }

  // Add a new entry
  static async addEntry(entry: Omit<JournalEntry, 'id'>, userId: string): Promise<string> {
    try {
      const docRef = await addDoc(
        collection(db, this.COLLECTION_NAME),
        convertToFirestoreData(entry, userId)
      );
      return docRef.id;
    } catch (error) {
      console.error('Error adding entry:', error);
      throw new Error('Failed to add entry to Firestore');
    }
  }

  // Update an existing entry
  static async updateEntry(entryId: string, updates: Partial<JournalEntry>, userId: string): Promise<void> {
    try {
      const docRef = doc(db, this.COLLECTION_NAME, entryId);
      await updateDoc(docRef, convertToFirestoreData(updates, userId));
    } catch (error) {
      console.error('Error updating entry:', error);
      throw new Error('Failed to update entry in Firestore');
    }
  }

  // Delete an entry
  static async deleteEntry(entryId: string): Promise<void> {
    try {
      const docRef = doc(db, this.COLLECTION_NAME, entryId);
      await deleteDoc(docRef);
    } catch (error) {
      console.error('Error deleting entry:', error);
      throw new Error('Failed to delete entry from Firestore');
    }
  }

  // Batch operations for syncing multiple entries
  static async batchSyncEntries(entries: JournalEntry[], userId: string): Promise<void> {
    try {
      const batch: WriteBatch = writeBatch(db);
      
      entries.forEach((entry) => {
        if (entry.id) {
          // Update existing entry
          const docRef = doc(db, this.COLLECTION_NAME, entry.id);
          batch.update(docRef, convertToFirestoreData(entry, userId));
        } else {
          // Add new entry
          const docRef = doc(collection(db, this.COLLECTION_NAME));
          batch.set(docRef, convertToFirestoreData(entry, userId));
        }
      });

      await batch.commit();
    } catch (error) {
      console.error('Error in batch sync:', error);
      throw new Error('Failed to sync entries to Firestore');
    }
  }

  // Real-time listener for user entries
  static subscribeToUserEntries(
    userId: string, 
    callback: (entries: JournalEntry[]) => void
  ): () => void {
    const q = query(
      collection(db, this.COLLECTION_NAME),
      where('userId', '==', userId),
      orderBy('timestamp', 'desc')
    );

    return onSnapshot(
      q,
      (querySnapshot) => {
        const entries = querySnapshot.docs.map(convertFirestoreEntry);
        callback(entries);
      },
      (error) => {
        console.error('Error in real-time listener:', error);
      }
    );
  }
}