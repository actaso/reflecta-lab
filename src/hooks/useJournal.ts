import { useState, useEffect, useCallback } from 'react';
import { JournalEntry } from '@/types/journal';
import { FirestoreService } from '@/lib/firestore';
import { useFirebaseAuth } from './useFirebaseAuth';

export const useJournal = () => {
  const { user, isAuthenticated } = useFirebaseAuth();
  const [entries, setEntries] = useState<JournalEntry[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Load entries when user is authenticated
  useEffect(() => {
    if (!isAuthenticated || !user?.uid) {
      setEntries([]);
      setLoading(false);
      return;
    }

    setLoading(true);
    setError(null);

    // Set up real-time listener
    const unsubscribe = FirestoreService.subscribeToUserEntries(
      user.uid,
      (fetchedEntries) => {
        setEntries(fetchedEntries);
        setLoading(false);
      }
    );

    // Cleanup listener on unmount or when user changes
    return () => {
      unsubscribe();
      setLoading(false);
    };
  }, [user?.uid, isAuthenticated]); // Use stable user.uid instead of full user object

  const addEntry = useCallback(async (entry: Omit<JournalEntry, 'id'>): Promise<string | null> => {
    if (!isAuthenticated || !user?.uid) {
      setError('User must be authenticated to add entries');
      return null;
    }

    try {
      setError(null);
      // Ensure the entry has the required fields
      const entryWithUserData: Omit<JournalEntry, 'id'> = {
        ...entry,
        uid: user.uid,
        lastUpdated: entry.lastUpdated || new Date()
      };
      const entryId = await FirestoreService.addEntry(entryWithUserData, user.uid);
      return entryId;
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to add entry');
      return null;
    }
  }, [user?.uid, isAuthenticated]);

  const updateEntry = useCallback(async (entryId: string, updates: Partial<JournalEntry>): Promise<boolean> => {
    if (!isAuthenticated || !user?.uid) {
      setError('User must be authenticated to update entries');
      return false;
    }

    try {
      setError(null);
      // Always update lastUpdated when making changes
      const updatesWithTimestamp: Partial<JournalEntry> = {
        ...updates,
        lastUpdated: new Date()
      };
      await FirestoreService.updateEntry(entryId, updatesWithTimestamp, user.uid);
      return true;
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to update entry');
      return false;
    }
  }, [user?.uid, isAuthenticated]);

  const deleteEntry = useCallback(async (entryId: string): Promise<boolean> => {
    if (!isAuthenticated || !user?.uid) {
      setError('User must be authenticated to delete entries');
      return false;
    }

    try {
      setError(null);
      await FirestoreService.deleteEntry(entryId);
      return true;
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to delete entry');
      return false;
    }
  }, [user?.uid, isAuthenticated]);

  const syncEntries = useCallback(async (localEntries: JournalEntry[]): Promise<boolean> => {
    if (!isAuthenticated || !user?.uid) {
      setError('User must be authenticated to sync entries');
      return false;
    }

    try {
      setError(null);
      await FirestoreService.batchSyncEntries(localEntries, user.uid);
      return true;
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to sync entries');
      return false;
    }
  }, [user?.uid, isAuthenticated]);

  return {
    entries,
    loading,
    error,
    addEntry,
    updateEntry,
    deleteEntry,
    syncEntries,
    isAuthenticated
  };
};