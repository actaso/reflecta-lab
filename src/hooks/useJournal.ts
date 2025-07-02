import { useState, useEffect, useCallback } from 'react';
import { JournalEntry } from '@/types/journal';
import { FirestoreService } from '@/lib/firestore';
import { SyncService, SyncState } from '@/services/syncService';
import { useFirebaseAuth } from './useFirebaseAuth';

export const useJournal = () => {
  const { user, isAuthenticated } = useFirebaseAuth();
  const [entries, setEntries] = useState<JournalEntry[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [syncState, setSyncState] = useState<SyncState>('offline');
  const [conflicts, setConflicts] = useState<JournalEntry[]>([]);

  // Load entries from localStorage and sync when authenticated
  useEffect(() => {
    // Always load from localStorage first (immediate UI)
    const loadLocalEntries = () => {
      try {
        const savedEntries = localStorage.getItem('journal-entries');
        if (savedEntries) {
          const parsed = JSON.parse(savedEntries);
          const allEntries: JournalEntry[] = [];
          
          Object.values(parsed).forEach((dayEntries: any) => {
            dayEntries.forEach((entry: any) => {
              allEntries.push({
                id: entry.id as string,
                timestamp: new Date(entry.timestamp as string),
                content: entry.content as string,
                uid: (entry.uid as string) || 'local-user',
                lastUpdated: entry.lastUpdated ? new Date(entry.lastUpdated as string) : new Date(entry.timestamp as string)
              });
            });
          });
          
          setEntries(allEntries);
        }
      } catch (error) {
        console.error('Failed to load local entries:', error);
        setError('Failed to load entries from local storage');
      }
      setLoading(false);
    };

    setLoading(true);
    setError(null);
    loadLocalEntries();

    // If authenticated, sync with Firestore in the background
    if (isAuthenticated && user?.uid) {
      setSyncState('syncing');
      
      const performBackgroundSync = async () => {
        try {
          // Sync from remote (pull changes)
          const mergedEntries = await SyncService.syncFromRemote(user.uid);
          setEntries(mergedEntries);
          
          // Process any queued entries (push changes)
          const queueResult = await SyncService.processQueue(user.uid);
          if (queueResult.conflicts.length > 0) {
            setConflicts(queueResult.conflicts);
          }
          
          setSyncState('synced');
        } catch (error) {
          console.error('Background sync failed:', error);
          setSyncState('error');
          setError('Sync failed - working offline');
        }
      };

      // Start background sync after a brief delay to not block UI
      setTimeout(performBackgroundSync, 100);
    } else {
      setSyncState('offline');
    }
  }, [user?.uid, isAuthenticated]);

  const addEntry = useCallback(async (entry: Omit<JournalEntry, 'id'>): Promise<string | null> => {
    try {
      setError(null);
      
      // Create the new entry with all required fields
      const now = new Date();
      const newEntry: JournalEntry = {
        ...entry,
        id: crypto.randomUUID(),
        uid: user?.uid || 'local-user',
        lastUpdated: entry.lastUpdated || now,
        timestamp: entry.timestamp || now
      };

      // 1. Update localStorage immediately (fast UI response)
      const currentEntries = [...entries, newEntry];
      setEntries(currentEntries);
      
      // Save to localStorage in the expected date-keyed format
      const entriesByDate: Record<string, JournalEntry[]> = {};
      currentEntries.forEach(entry => {
        const dateKey = entry.timestamp.toISOString().split('T')[0];
        if (!entriesByDate[dateKey]) {
          entriesByDate[dateKey] = [];
        }
        entriesByDate[dateKey].push(entry);
      });
      localStorage.setItem('journal-entries', JSON.stringify(entriesByDate));

      // 2. Background sync to Firestore if authenticated
      if (isAuthenticated && user?.uid) {
        setSyncState('syncing');
        try {
          const syncResult = await SyncService.syncEntryToRemote(newEntry, user.uid);
          
          if (syncResult.synced) {
            setSyncState('synced');
          } else if (syncResult.conflict) {
            setConflicts([...conflicts, syncResult.conflict]);
            setSyncState('conflict');
          }
        } catch (err) {
          // Sync failed - queue for retry
          SyncService.queueForSync(newEntry, 'create');
          setSyncState('error');
          console.warn('Failed to sync new entry, queued for retry:', err);
        }
      }

      return newEntry.id;
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to add entry');
      return null;
    }
  }, [user?.uid, isAuthenticated, entries, conflicts]);

  const updateEntry = useCallback(async (entryId: string, updates: Partial<JournalEntry>): Promise<boolean> => {
    try {
      setError(null);
      
      // Find the entry to update
      const entryIndex = entries.findIndex(e => e.id === entryId);
      if (entryIndex === -1) {
        setError('Entry not found');
        return false;
      }

      // 1. Update localStorage immediately (fast UI response)
      const updatedEntry: JournalEntry = {
        ...entries[entryIndex],
        ...updates,
        lastUpdated: new Date() // Always update timestamp
      };
      
      const updatedEntries = [...entries];
      updatedEntries[entryIndex] = updatedEntry;
      setEntries(updatedEntries);
      
      // Save to localStorage in the expected date-keyed format
      const entriesByDate: Record<string, JournalEntry[]> = {};
      updatedEntries.forEach(entry => {
        const dateKey = entry.timestamp.toISOString().split('T')[0];
        if (!entriesByDate[dateKey]) {
          entriesByDate[dateKey] = [];
        }
        entriesByDate[dateKey].push(entry);
      });
      localStorage.setItem('journal-entries', JSON.stringify(entriesByDate));

      // 2. Background sync to Firestore if authenticated
      if (isAuthenticated && user?.uid) {
        setSyncState('syncing');
        try {
          const syncResult = await SyncService.syncEntryToRemote(updatedEntry, user.uid);
          
          if (syncResult.synced) {
            setSyncState('synced');
          } else if (syncResult.conflict) {
            setConflicts([...conflicts, syncResult.conflict]);
            setSyncState('conflict');
          }
        } catch (err) {
          // Sync failed - queue for retry
          SyncService.queueForSync(updatedEntry, 'update');
          setSyncState('error');
          console.warn('Failed to sync updated entry, queued for retry:', err);
        }
      }

      return true;
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to update entry');
      return false;
    }
  }, [user?.uid, isAuthenticated, entries, conflicts]);

  const deleteEntry = useCallback(async (entryId: string): Promise<boolean> => {
    try {
      setError(null);
      
      // Find the entry to delete
      const entryToDelete = entries.find(e => e.id === entryId);
      if (!entryToDelete) {
        setError('Entry not found');
        return false;
      }

      // 1. Update localStorage immediately (fast UI response)
      const updatedEntries = entries.filter(e => e.id !== entryId);
      setEntries(updatedEntries);
      
      // Save to localStorage in the expected date-keyed format
      const entriesByDate: Record<string, JournalEntry[]> = {};
      updatedEntries.forEach(entry => {
        const dateKey = entry.timestamp.toISOString().split('T')[0];
        if (!entriesByDate[dateKey]) {
          entriesByDate[dateKey] = [];
        }
        entriesByDate[dateKey].push(entry);
      });
      localStorage.setItem('journal-entries', JSON.stringify(entriesByDate));

      // 2. Background sync to Firestore if authenticated
      if (isAuthenticated && user?.uid) {
        setSyncState('syncing');
        try {
          await FirestoreService.deleteEntry(entryId);
          setSyncState('synced');
        } catch (err) {
          // Sync failed - queue for retry
          SyncService.queueForSync(entryToDelete, 'delete');
          setSyncState('error');
          console.warn('Failed to sync entry deletion, queued for retry:', err);
        }
      }

      return true;
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to delete entry');
      return false;
    }
  }, [user?.uid, isAuthenticated, entries]);

  // Manual sync trigger for UI
  const manualSync = useCallback(async (): Promise<boolean> => {
    if (!isAuthenticated || !user?.uid) {
      setError('User must be authenticated to sync');
      return false;
    }

    try {
      setError(null);
      setSyncState('syncing');
      
      // Sync from remote and process queue
      const mergedEntries = await SyncService.syncFromRemote(user.uid);
      setEntries(mergedEntries);
      
      const queueResult = await SyncService.processQueue(user.uid);
      if (queueResult.conflicts.length > 0) {
        setConflicts([...conflicts, ...queueResult.conflicts]);
        setSyncState('conflict');
      } else {
        setSyncState('synced');
      }
      
      return true;
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Manual sync failed');
      setSyncState('error');
      return false;
    }
  }, [user?.uid, isAuthenticated, conflicts]);

  return {
    entries,
    loading,
    error,
    syncState,
    conflicts,
    addEntry,
    updateEntry,
    deleteEntry,
    manualSync,
    isAuthenticated
  };
};