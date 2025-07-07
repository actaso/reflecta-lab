import { 
  collection, 
  doc, 
  getDoc,
  getDocs, 
  addDoc, 
  updateDoc, 
  setDoc,
  deleteDoc, 
  query, 
  where, 
  orderBy, 
  onSnapshot,
  serverTimestamp,
  Timestamp,
  WriteBatch,
  writeBatch,
  FieldValue
} from 'firebase/firestore';
import { db } from './firebase';
import { JournalEntry, UserAccount, MorningGuidance } from '@/types/journal';

// Firestore document interface (includes Firestore metadata)
export interface FirestoreJournalEntry {
  id?: string;
  uid: string;
  content: string;
  timestamp: Timestamp | FieldValue;
  lastUpdated: Timestamp | FieldValue;
  createdAt: Timestamp | FieldValue;
  updatedAt: Timestamp | FieldValue;
}

// Firestore user account interface
export interface FirestoreUserAccount {
  uid: string;
  currentMorningGuidance?: {
    journalQuestion: string;
    detailedMorningPrompt: string;
    reasoning: string;
    generatedAt: Timestamp | FieldValue;
    usedAt?: Timestamp | FieldValue;
  };
  alignment?: string;
  createdAt: Timestamp | FieldValue;
  updatedAt: Timestamp | FieldValue;
}

// Convert Firestore document to JournalEntry
const convertFirestoreEntry = (doc: { id: string; data: () => any }): JournalEntry => { // eslint-disable-line @typescript-eslint/no-explicit-any
  const data = doc.data();
  return {
    id: doc.id,
    content: data.content as string,
    timestamp: (data.timestamp as Timestamp).toDate(),
    uid: data.uid as string,
    lastUpdated: data.lastUpdated ? (data.lastUpdated as Timestamp).toDate() : (data.updatedAt as Timestamp).toDate()
  };
};

// Convert JournalEntry to Firestore document data
const convertToFirestoreData = (entry: Partial<JournalEntry>, userId: string): Partial<FirestoreJournalEntry> => ({
  uid: userId,
  content: entry.content,
  timestamp: entry.timestamp ? Timestamp.fromDate(entry.timestamp) : serverTimestamp(),
  lastUpdated: entry.lastUpdated ? Timestamp.fromDate(entry.lastUpdated) : serverTimestamp(),
  updatedAt: serverTimestamp(),
  ...(entry.id ? {} : { createdAt: serverTimestamp() })
});

// Convert Firestore document to UserAccount
const convertFirestoreUserAccount = (doc: { id: string; data: () => any }): UserAccount => { // eslint-disable-line @typescript-eslint/no-explicit-any
  const data = doc.data();
  console.log('🔍 [DEBUG] Converting Firestore user data:', data);
  
  // Validate required fields
  if (!data.uid) {
    throw new Error('User document missing uid field');
  }
  
  if (!data.updatedAt) {
    throw new Error('User document missing updatedAt field');
  }
  
  // Handle missing createdAt field (for documents created before this fix)
  const createdAt = data.createdAt ? (data.createdAt as Timestamp).toDate() : (data.updatedAt as Timestamp).toDate();
  
  // Convert morning guidance if it exists
  let currentMorningGuidance: MorningGuidance | undefined = undefined;
  if (data.currentMorningGuidance) {
    currentMorningGuidance = {
      journalQuestion: data.currentMorningGuidance.journalQuestion,
      detailedMorningPrompt: data.currentMorningGuidance.detailedMorningPrompt,
      reasoning: data.currentMorningGuidance.reasoning,
      generatedAt: (data.currentMorningGuidance.generatedAt as Timestamp).toDate(),
      usedAt: data.currentMorningGuidance.usedAt ? (data.currentMorningGuidance.usedAt as Timestamp).toDate() : undefined
    };
  }
  
  return {
    uid: data.uid as string,
    currentMorningGuidance,
    alignment: data.alignment as string | undefined,
    createdAt,
    updatedAt: (data.updatedAt as Timestamp).toDate()
  };
};

// Convert UserAccount to Firestore document data
const convertToFirestoreUserData = (userAccount: Partial<UserAccount>): Partial<FirestoreUserAccount> => {
  const now = Timestamp.now();
  const data: Partial<FirestoreUserAccount> = {
    uid: userAccount.uid!,
    updatedAt: now,
    ...(userAccount.createdAt ? { createdAt: Timestamp.fromDate(userAccount.createdAt) } : { createdAt: now })
  };


  // Include morning guidance if it exists
  if (userAccount.currentMorningGuidance) {
    data.currentMorningGuidance = {
      journalQuestion: userAccount.currentMorningGuidance.journalQuestion,
      detailedMorningPrompt: userAccount.currentMorningGuidance.detailedMorningPrompt,
      reasoning: userAccount.currentMorningGuidance.reasoning,
      generatedAt: Timestamp.fromDate(userAccount.currentMorningGuidance.generatedAt),
      ...(userAccount.currentMorningGuidance.usedAt && {
        usedAt: Timestamp.fromDate(userAccount.currentMorningGuidance.usedAt)
      })
    };
  }

  // Include alignment if it exists
  if (userAccount.alignment !== undefined) {
    data.alignment = userAccount.alignment;
  }

  return data;
};

export class FirestoreService {
  private static COLLECTION_NAME = 'journal_entries';
  private static USERS_COLLECTION_NAME = 'users';

  // NEW: Upsert method using set() with merge - handles both create and update atomically
  static async upsertEntry(entry: JournalEntry, userId: string): Promise<void> {
    try {
      const docRef = doc(db, this.COLLECTION_NAME, entry.id);
      await setDoc(docRef, convertToFirestoreData(entry, userId), { merge: true });
      // Only log in development for debugging
      if (process.env.NODE_ENV === 'development') {
        console.log('✅ [FIRESTORE] Entry synced:', entry.id);
      }
    } catch (error) {
      console.error('❌ [FIRESTORE] Upsert failed:', error);
      throw new Error('Failed to upsert entry in Firestore');
    }
  }

  // Get all entries for a user
  static async getUserEntries(userId: string): Promise<JournalEntry[]> {
    try {
      const q = query(
        collection(db, this.COLLECTION_NAME),
        where('uid', '==', userId),
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
        const docRef = doc(db, this.COLLECTION_NAME, entry.id);
        // Use set with merge for batch operations too
        batch.set(docRef, convertToFirestoreData(entry, userId), { merge: true });
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
      where('uid', '==', userId),
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

  // User Account Methods
  
  // Get or create user account
  static async getUserAccount(userId: string): Promise<UserAccount> {
    try {
      console.log('🔍 [DEBUG] Getting user account for userId:', userId);
      const docRef = doc(db, this.USERS_COLLECTION_NAME, userId);
      console.log('🔍 [DEBUG] Document reference created for path:', `${this.USERS_COLLECTION_NAME}/${userId}`);
      
      const docSnap = await getDoc(docRef);
      console.log('🔍 [DEBUG] Document snapshot exists:', docSnap.exists());
      
      if (docSnap.exists()) {
        console.log('🔍 [DEBUG] Document data exists, converting...');
        const userData = docSnap.data();
        
        // Fix missing createdAt field for existing documents
        if (!userData.createdAt && userData.updatedAt) {
          console.log('🔧 [FIX] Adding missing createdAt field to existing document');
          await updateDoc(docRef, {
            createdAt: userData.updatedAt
          });
        }
        
        return convertFirestoreUserAccount({ id: docSnap.id, data: () => docSnap.data() });
      } else {
        console.log('🔍 [DEBUG] Document does not exist, creating new user account...');
        // Create new user account
        const newUserAccount: UserAccount = {
          uid: userId,
          createdAt: new Date(),
          updatedAt: new Date()
        };
        
        console.log('🔍 [DEBUG] New user account object:', newUserAccount);
        const firestoreData = convertToFirestoreUserData(newUserAccount);
        console.log('🔍 [DEBUG] Converted Firestore data:', firestoreData);
        
        await setDoc(docRef, firestoreData);
        console.log('🔍 [DEBUG] User document created successfully');
        return newUserAccount;
      }
    } catch (error) {
      console.error('🚨 [ERROR] Error getting user account:', error);
      console.error('🚨 [ERROR] Error details:', {
        userId,
        errorCode: (error as any)?.code,
        errorMessage: (error as any)?.message,
        fullError: error
      });
      throw new Error('Failed to get user account from Firestore');
    }
  }

  // Update user account
  static async updateUserAccount(userId: string, updates: Partial<UserAccount>): Promise<void> {
    try {
      const docRef = doc(db, this.USERS_COLLECTION_NAME, userId);
      await updateDoc(docRef, convertToFirestoreUserData(updates));
    } catch (error) {
      console.error('Error updating user account:', error);
      throw new Error('Failed to update user account in Firestore');
    }
  }



  // Save morning guidance to user account
  static async saveMorningGuidance(userId: string, guidance: Omit<MorningGuidance, 'generatedAt'>): Promise<void> {
    try {
      const now = new Date();
      
      const morningGuidance: MorningGuidance = {
        ...guidance,
        generatedAt: now
      };

      const docRef = doc(db, this.USERS_COLLECTION_NAME, userId);
      await updateDoc(docRef, {
        currentMorningGuidance: {
          journalQuestion: morningGuidance.journalQuestion,
          detailedMorningPrompt: morningGuidance.detailedMorningPrompt,
          reasoning: morningGuidance.reasoning,
          generatedAt: Timestamp.fromDate(morningGuidance.generatedAt)
        },
        updatedAt: serverTimestamp()
      });
    } catch (error) {
      console.error('Error saving morning guidance:', error);
      throw new Error('Failed to save morning guidance to Firestore');
    }
  }

  // Get current morning guidance for today
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
      console.error('Error getting current morning guidance:', error);
      return null;
    }
  }

  // Save user alignment
  static async saveAlignment(userId: string, alignment: string): Promise<void> {
    try {
      const docRef = doc(db, this.USERS_COLLECTION_NAME, userId);
      await updateDoc(docRef, {
        alignment,
        updatedAt: serverTimestamp()
      });
    } catch (error) {
      console.error('Error saving alignment:', error);
      throw new Error('Failed to save alignment to Firestore');
    }
  }
}