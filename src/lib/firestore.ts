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
  limit,
  onSnapshot,
  serverTimestamp,
  Timestamp,
  WriteBatch,
  writeBatch,
  FieldValue
} from 'firebase/firestore';
import { db } from './firebase';
import { JournalEntry, UserAccount, ImageMetadata } from '@/types/journal';
import { userInsight } from '@/types/insights';
import { CoachingMessage } from '@/types/coachingMessage';
import { generateDefaultUserAccount, DEFAULT_USER_ACCOUNT_FIELDS } from './userAccountDefaults';

// Firestore document interface (includes Firestore metadata)
export interface FirestoreJournalEntry {
  id?: string;
  uid: string;
  content: string;
  timestamp: Timestamp | FieldValue;
  lastUpdated: Timestamp | FieldValue;
  createdAt: Timestamp | FieldValue;
  updatedAt: Timestamp | FieldValue;
  images?: ImageMetadata[];
  linkedCoachingSessionId?: string;
  linkedCoachingMessageId?: string;
}

// Firestore user account interface
export interface FirestoreUserAccount {
  uid: string;
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
    lastUpdated: data.lastUpdated ? (data.lastUpdated as Timestamp).toDate() : (data.updatedAt as Timestamp).toDate(),
    images: data.images || [],
    linkedCoachingSessionId: data.linkedCoachingSessionId,
    linkedCoachingMessageId: data.linkedCoachingMessageId
  };
};

// Convert JournalEntry to Firestore document data
const convertToFirestoreData = (entry: Partial<JournalEntry>, userId: string): Partial<FirestoreJournalEntry> => {
  const firestoreData: Partial<FirestoreJournalEntry> = {
    uid: userId,
    content: entry.content,
    timestamp: entry.timestamp ? Timestamp.fromDate(entry.timestamp) : serverTimestamp(),
    lastUpdated: entry.lastUpdated ? Timestamp.fromDate(entry.lastUpdated) : serverTimestamp(),
    updatedAt: serverTimestamp(),
    images: entry.images || [],
    ...(entry.id ? {} : { createdAt: serverTimestamp() })
  };

  // Only include linked IDs if they have actual values (not undefined)
  if (entry.linkedCoachingSessionId) {
    firestoreData.linkedCoachingSessionId = entry.linkedCoachingSessionId;
  }
  
  if (entry.linkedCoachingMessageId) {
    firestoreData.linkedCoachingMessageId = entry.linkedCoachingMessageId;
  }

  return firestoreData;
};

// Convert Firestore document to UserAccount
const convertFirestoreUserAccount = (doc: { id: string; data: () => any }): UserAccount => { // eslint-disable-line @typescript-eslint/no-explicit-any
  const data = doc.data();
  
  // Validate required fields
  if (!data.uid) {
    throw new Error('User document missing uid field');
  }
  
  if (!data.updatedAt) {
    throw new Error('User document missing updatedAt field');
  }
  
  // Handle missing createdAt field (for documents created before this fix)
  const createdAt = data.createdAt ? (data.createdAt as Timestamp).toDate() : (data.updatedAt as Timestamp).toDate();
  

  
  return {
    uid: data.uid as string,
    email: data.email || DEFAULT_USER_ACCOUNT_FIELDS.email,
    createdAt,
    updatedAt: (data.updatedAt as Timestamp).toDate(),
    firstName: data.firstName || DEFAULT_USER_ACCOUNT_FIELDS.firstName,
    onboardingData: data.onboardingData || DEFAULT_USER_ACCOUNT_FIELDS.onboardingData,
    coachingConfig: data.coachingConfig || DEFAULT_USER_ACCOUNT_FIELDS.coachingConfig,
    mobilePushNotifications: data.mobilePushNotifications || DEFAULT_USER_ACCOUNT_FIELDS.mobilePushNotifications,
    userTimezone: data.userTimezone || DEFAULT_USER_ACCOUNT_FIELDS.userTimezone,
    nextCoachingMessageDue: data.nextCoachingMessageDue || DEFAULT_USER_ACCOUNT_FIELDS.nextCoachingMessageDue,
  };
};

// Convert UserAccount to Firestore document data
const convertToFirestoreUserData = (userAccount: Partial<UserAccount>): any => { // eslint-disable-line @typescript-eslint/no-explicit-any
  const now = Timestamp.now();
  
  // Base data with timestamps
  const data: any = { // eslint-disable-line @typescript-eslint/no-explicit-any
    uid: userAccount.uid!,
    updatedAt: now,
    ...(userAccount.createdAt ? { createdAt: Timestamp.fromDate(userAccount.createdAt) } : { createdAt: now })
  };

  // Include all other UserAccount fields if they exist
  if (userAccount.email !== undefined) data.email = userAccount.email;
  if (userAccount.firstName !== undefined) data.firstName = userAccount.firstName;
  if (userAccount.onboardingData !== undefined) data.onboardingData = userAccount.onboardingData;
  if (userAccount.coachingConfig !== undefined) data.coachingConfig = userAccount.coachingConfig;
  if (userAccount.mobilePushNotifications !== undefined) data.mobilePushNotifications = userAccount.mobilePushNotifications;
  if (userAccount.userTimezone !== undefined) data.userTimezone = userAccount.userTimezone;
  if (userAccount.nextCoachingMessageDue !== undefined) data.nextCoachingMessageDue = userAccount.nextCoachingMessageDue;

  return data;
};

export class FirestoreService {
  private static COLLECTION_NAME = 'journal_entries';
  private static USERS_COLLECTION_NAME = 'users';
  private static INSIGHTS_COLLECTION_NAME = 'userInsights';

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
  static async getUserAccount(userId: string, email?: string): Promise<UserAccount> {
    try {
      const docRef = doc(db, this.USERS_COLLECTION_NAME, userId);
      const docSnap = await getDoc(docRef);
      
      if (docSnap.exists()) {
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
        // Create new user account with intelligent defaults
        const newUserAccount = generateDefaultUserAccount(userId, email || '');
        
        const firestoreData = convertToFirestoreUserData(newUserAccount);
        await setDoc(docRef, firestoreData);
        return newUserAccount;
      }
    } catch (error) {
      console.error('🚨 [ERROR] Error getting user account:', error);
      console.error('🚨 [ERROR] Error details:', {
        userId,
        errorCode: error instanceof Error ? error.name : 'Unknown',
        errorMessage: error instanceof Error ? error.message : String(error),
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

  // User Insights Methods
  
  /**
   * Get user insights from userInsights collection
   */
  static async getUserInsights(userId: string): Promise<userInsight | null> {
    try {
      const q = query(
        collection(db, this.INSIGHTS_COLLECTION_NAME),
        where('userId', '==', userId),
        orderBy('updatedAt', 'desc'),
        limit(1)
      );
      
      const querySnapshot = await getDocs(q);
      
      if (querySnapshot.empty) {
        return null;
      }
      
      const doc = querySnapshot.docs[0];
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
      throw new Error('Failed to fetch insights from Firestore');
    }
  }

  /**
   * Real-time listener for user insights
   */
  static subscribeToUserInsights(
    userId: string,
    callback: (insights: userInsight | null) => void
  ): () => void {
    const q = query(
      collection(db, this.INSIGHTS_COLLECTION_NAME),
      where('userId', '==', userId),
      orderBy('updatedAt', 'desc'),
      limit(1)
    );

    return onSnapshot(
      q,
      (querySnapshot) => {
        if (querySnapshot.empty) {
          callback(null);
          return;
        }
        
        const doc = querySnapshot.docs[0];
        const data = doc.data();
        
        const insights: userInsight = {
          mainFocus: data.mainFocus,
          keyBlockers: data.keyBlockers,
          plan: data.plan,
          userId: data.userId,
          createdAt: data.createdAt,
          updatedAt: data.updatedAt
        };
        
        callback(insights);
      },
      (error) => {
        console.error('Error in insights real-time listener:', error);
        callback(null);
      }
    );
  }

  /**
   * Get a specific coaching message by ID
   */
  static async getCoachingMessage(messageId: string): Promise<CoachingMessage | null> {
    try {
      const docRef = doc(db, 'coachingMessages', messageId);
      const docSnap = await getDoc(docRef);
      
      if (!docSnap.exists()) {
        return null;
      }
      
      const data = docSnap.data();
      
      // Convert the Firestore document to CoachingMessage type
      const coachingMessage: CoachingMessage = {
        id: messageId, // Include the document ID
        uid: data.uid,
        createdAt: data.createdAt,
        updatedAt: data.updatedAt,
        messageContent: data.messageContent,
        messageType: data.messageType,
        pushNotificationText: data.pushNotificationText,
        effectivenessRating: data.effectivenessRating || 0,
        recommendedAction: data.recommendedAction,
        wasSent: data.wasSent || false,
        journalEntryId: data.journalEntryId,
        contextUsed: data.contextUsed || '',
        generationAttempt: data.generationAttempt || 1,
        failureReason: data.failureReason,
        userTimezone: data.userTimezone || '',
        userTimePreference: data.userTimePreference || 'morning',
        scheduledFor: data.scheduledFor
      };
      
      return coachingMessage;
    } catch (error) {
      console.error('Error fetching coaching message:', error);
      throw new Error('Failed to fetch coaching message from Firestore');
    }
  }
}