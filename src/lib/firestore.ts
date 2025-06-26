'use client';

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
  limit,
  Timestamp,
  type DocumentReference,
  type QuerySnapshot,
  type DocumentData,
} from 'firebase/firestore';
import { getFirestoreDb, isFirebaseConfigured } from './firebase';
import { useFirebaseAuth } from './firebase-auth';
import { useCallback, useEffect, useState } from 'react';

// Type definitions matching your existing journal entry structure
export type JournalEntry = {
  id: string;
  timestamp: Date;
  content: string;
};

// Firestore document structure
export type FirestoreJournalEntry = {
  id?: string;
  userId: string;
  timestamp: Timestamp;
  content: string;
  createdAt: Timestamp;
  updatedAt?: Timestamp;
};

/**
 * Convert Firestore document to JournalEntry
 */
function firestoreToJournalEntry(doc: DocumentData): JournalEntry {
  return {
    id: doc.id,
    timestamp: doc.timestamp.toDate(),
    content: doc.content,
  };
}

/**
 * Convert JournalEntry to Firestore document
 */
function journalEntryToFirestore(
  entry: Omit<JournalEntry, 'id'>,
  userId: string,
  isUpdate = false
): Omit<FirestoreJournalEntry, 'id'> {
  const now = Timestamp.now();
  const baseData = {
    userId,
    timestamp: Timestamp.fromDate(entry.timestamp),
    content: entry.content,
  };

  if (isUpdate) {
    return {
      ...baseData,
      updatedAt: now,
    };
  }

  return {
    ...baseData,
    createdAt: now,
  };
}

/**
 * Hook for Firestore journal entries operations
 */
export function useFirestoreEntries() {
  const [entries, setEntries] = useState<Record<string, JournalEntry[]>>({});
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const { firebaseUser, isAuthenticated, isFirebaseConfigured: fbConfigured } = useFirebaseAuth();

  /**
   * Fetch all entries for the current user
   */
  const fetchEntries = useCallback(async (): Promise<Record<string, JournalEntry[]>> => {
    if (!fbConfigured || !isAuthenticated || !firebaseUser) {
      return {};
    }

    try {
      setError(null);
      const db = getFirestoreDb();
      const entriesRef = collection(db, 'entries');
      
      const q = query(
        entriesRef,
        where('userId', '==', firebaseUser.uid),
        orderBy('timestamp', 'desc')
      );

      const snapshot = await getDocs(q);
      const fetchedEntries: JournalEntry[] = [];

      snapshot.forEach((doc) => {
        fetchedEntries.push({
          id: doc.id,
          ...firestoreToJournalEntry(doc.data()),
        });
      });

      // Group entries by date (matching existing localStorage structure)
      const groupedEntries: Record<string, JournalEntry[]> = {};
      fetchedEntries.forEach((entry) => {
        const dateKey = entry.timestamp.toISOString().split('T')[0]; // YYYY-MM-DD
        if (!groupedEntries[dateKey]) {
          groupedEntries[dateKey] = [];
        }
        groupedEntries[dateKey].push(entry);
      });

      setEntries(groupedEntries);
      return groupedEntries;
    } catch (err) {
      console.error('Failed to fetch entries:', err);
      setError(err instanceof Error ? err.message : 'Failed to fetch entries');
      return {};
    }
  }, [fbConfigured, isAuthenticated, firebaseUser]);

  /**
   * Add a new entry
   */
  const addEntry = useCallback(async (entry: Omit<JournalEntry, 'id'>): Promise<string | null> => {
    if (!fbConfigured || !isAuthenticated || !firebaseUser) {
      throw new Error('Not authenticated or Firebase not configured');
    }

    try {
      setError(null);
      const db = getFirestoreDb();
      const entriesRef = collection(db, 'entries');
      
      const firestoreData = journalEntryToFirestore(entry, firebaseUser.uid);
      const docRef = await addDoc(entriesRef, firestoreData);

      // Update local state
      const newEntry: JournalEntry = { ...entry, id: docRef.id };
      const dateKey = entry.timestamp.toISOString().split('T')[0];
      
      setEntries((prev) => ({
        ...prev,
        [dateKey]: [newEntry, ...(prev[dateKey] || [])],
      }));

      return docRef.id;
    } catch (err) {
      console.error('Failed to add entry:', err);
      setError(err instanceof Error ? err.message : 'Failed to add entry');
      throw err;
    }
  }, [fbConfigured, isAuthenticated, firebaseUser]);

  /**
   * Update an existing entry
   */
  const updateEntry = useCallback(async (
    entryId: string,
    updates: Partial<Omit<JournalEntry, 'id'>>
  ): Promise<void> => {
    if (!fbConfigured || !isAuthenticated || !firebaseUser) {
      throw new Error('Not authenticated or Firebase not configured');
    }

    try {
      setError(null);
      const db = getFirestoreDb();
      const entryRef = doc(db, 'entries', entryId);
      
      const firestoreUpdates: Partial<FirestoreJournalEntry> = {};
      
      if (updates.content !== undefined) {
        firestoreUpdates.content = updates.content;
      }
      
      if (updates.timestamp !== undefined) {
        firestoreUpdates.timestamp = Timestamp.fromDate(updates.timestamp);
      }
      
      firestoreUpdates.updatedAt = Timestamp.now();

      await updateDoc(entryRef, firestoreUpdates);

      // Update local state
      setEntries((prev) => {
        const newEntries = { ...prev };
        for (const dateKey in newEntries) {
          const entryIndex = newEntries[dateKey].findIndex((e) => e.id === entryId);
          if (entryIndex !== -1) {
            newEntries[dateKey][entryIndex] = {
              ...newEntries[dateKey][entryIndex],
              ...updates,
            };
            break;
          }
        }
        return newEntries;
      });
    } catch (err) {
      console.error('Failed to update entry:', err);
      setError(err instanceof Error ? err.message : 'Failed to update entry');
      throw err;
    }
  }, [fbConfigured, isAuthenticated, firebaseUser]);

  /**
   * Delete an entry
   */
  const deleteEntry = useCallback(async (entryId: string): Promise<void> => {
    if (!fbConfigured || !isAuthenticated || !firebaseUser) {
      throw new Error('Not authenticated or Firebase not configured');
    }

    try {
      setError(null);
      const db = getFirestoreDb();
      const entryRef = doc(db, 'entries', entryId);
      
      await deleteDoc(entryRef);

      // Update local state
      setEntries((prev) => {
        const newEntries = { ...prev };
        for (const dateKey in newEntries) {
          newEntries[dateKey] = newEntries[dateKey].filter((e) => e.id !== entryId);
          if (newEntries[dateKey].length === 0) {
            delete newEntries[dateKey];
          }
        }
        return newEntries;
      });
    } catch (err) {
      console.error('Failed to delete entry:', err);
      setError(err instanceof Error ? err.message : 'Failed to delete entry');
      throw err;
    }
  }, [fbConfigured, isAuthenticated, firebaseUser]);

  /**
   * Get entries in chronological order (matching existing utility function)
   */
  const getAllEntriesChronological = useCallback((): { entry: JournalEntry; dateKey: string }[] => {
    const allEntries: { entry: JournalEntry; dateKey: string }[] = [];
    
    Object.entries(entries)
      .sort(([a], [b]) => b.localeCompare(a)) // Sort dates descending
      .forEach(([dateKey, dayEntries]) => {
        dayEntries
          .sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime()) // Sort entries descending
          .forEach((entry) => {
            allEntries.push({ entry, dateKey });
          });
      });
    
    return allEntries;
  }, [entries]);

  /**
   * Effect to fetch entries when authentication state changes
   */
  useEffect(() => {
    if (isAuthenticated && firebaseUser) {
      setIsLoading(true);
      fetchEntries().finally(() => setIsLoading(false));
    } else {
      setEntries({});
      setIsLoading(false);
    }
  }, [isAuthenticated, firebaseUser, fetchEntries]);

  return {
    entries,
    isLoading,
    error,
    isAvailable: fbConfigured && isAuthenticated,
    fetchEntries,
    addEntry,
    updateEntry,
    deleteEntry,
    getAllEntriesChronological,
  };
}