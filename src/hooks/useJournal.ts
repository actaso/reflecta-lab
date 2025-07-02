import { useState, useEffect, useCallback, useRef } from 'react';
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
  
  // Enhanced debouncing with content change detection
  const syncTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const lastSyncedContentRef = useRef<Map<string, string>>(new Map()); // Track last synced content per entry
  const SYNC_DEBOUNCE_MS = 1500; // Slightly longer debounce

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
          
          // Initialize last synced content tracking
          allEntries.forEach(entry => {
            lastSyncedContentRef.current.set(entry.id, entry.content);
          });
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
          
          // Update last synced content tracking after successful sync
          mergedEntries.forEach(entry => {
            lastSyncedContentRef.current.set(entry.id, entry.content);
          });
          
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

  // Helper function to save entries to localStorage
  const saveToLocalStorage = useCallback((entriesToSave: JournalEntry[]) => {
    const entriesByDate: Record<string, JournalEntry[]> = {};
    entriesToSave.forEach(entry => {
      const dateKey = entry.timestamp.toISOString().split('T')[0];
      if (!entriesByDate[dateKey]) {
        entriesByDate[dateKey] = [];
      }
      entriesByDate[dateKey].push(entry);
    });
    localStorage.setItem('journal-entries', JSON.stringify(entriesByDate));
  }, []);

  // Smart debounced sync with content change detection
  const debouncedUpsert = useCallback(async (entry: JournalEntry) => {
    if (!isAuthenticated || !user?.uid) return;

    // Clear any existing timeout
    if (syncTimeoutRef.current) {
      clearTimeout(syncTimeoutRef.current);
    }

    // Set new timeout for debounced sync
    syncTimeoutRef.current = setTimeout(async () => {
      try {
        // Check if content has actually changed since last sync
        const lastSyncedContent = lastSyncedContentRef.current.get(entry.id);
        const currentContent = entry.content.trim();
        
        if (lastSyncedContent === currentContent) {
          console.log('📝 [SYNC] Content unchanged, skipping sync for:', entry.id);
          return; // No need to sync if content hasn't changed
        }
        
        console.log('☁️ [SYNC] Content changed, syncing entry:', entry.id);
        setSyncState('syncing');
        
        // Perform the sync
        await FirestoreService.upsertEntry(entry, user.uid);
        
        // Update our tracking after successful sync
        lastSyncedContentRef.current.set(entry.id, currentContent);
        
        console.log('✅ [SYNC] Sync completed for:', entry.id);
        setSyncState('synced');
      } catch (err) {
        console.error('❌ [SYNC] Sync failed:', err);
        setSyncState('error');
        setError('Sync failed - changes saved locally');
      }
    }, SYNC_DEBOUNCE_MS);
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

      console.log('🆕 [ADD] Creating new entry:', newEntry.id);

      // 1. Update localStorage immediately (fast UI response)
      const currentEntries = [...entries, newEntry];
      setEntries(currentEntries);
      saveToLocalStorage(currentEntries);

      // 2. Immediate sync for new entries using atomic upsert
      if (isAuthenticated && user?.uid) {
        setSyncState('syncing');
        try {
          await FirestoreService.upsertEntry(newEntry, user.uid);
          
          // Track this content as synced
          lastSyncedContentRef.current.set(newEntry.id, newEntry.content);
          
          console.log('✅ [ADD] New entry synced:', newEntry.id);
          setSyncState('synced');
        } catch (err) {
          console.warn('⚠️ [ADD] Immediate sync failed, will retry on edit:', err);
          setSyncState('error');
        }
      }

      return newEntry.id;
    } catch (err) {
      console.error('💥 [ADD] Failed to add entry:', err);
      setError(err instanceof Error ? err.message : 'Failed to add entry');
      return null;
    }
  }, [user?.uid, isAuthenticated, entries, saveToLocalStorage]);

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
      saveToLocalStorage(updatedEntries);

      // 2. Smart debounced upsert (only if content actually changed)
      if (isAuthenticated && user?.uid) {
        await debouncedUpsert(updatedEntry);
      }

      return true;
    } catch (err) {
      console.error('💥 [UPDATE] Failed to update entry:', err);
      setError(err instanceof Error ? err.message : 'Failed to update entry');
      return false;
    }
  }, [user?.uid, isAuthenticated, entries, saveToLocalStorage, debouncedUpsert]);

  const deleteEntry = useCallback(async (entryId: string): Promise<boolean> => {
    try {
      setError(null);
      
      // Find the entry to delete
      const entryToDelete = entries.find(e => e.id === entryId);
      if (!entryToDelete) {
        setError('Entry not found');
        return false;
      }

      console.log('🗑️ [DELETE] Deleting entry:', entryId);

      // Remove from content tracking
      lastSyncedContentRef.current.delete(entryId);

      // 1. Update localStorage immediately (fast UI response)
      const updatedEntries = entries.filter(e => e.id !== entryId);
      setEntries(updatedEntries);
      saveToLocalStorage(updatedEntries);

      // 2. Immediate sync to Firestore for deletions
      if (isAuthenticated && user?.uid) {
        setSyncState('syncing');
        try {
          await FirestoreService.deleteEntry(entryId);
          console.log('✅ [DELETE] Deletion synced successfully:', entryId);
          setSyncState('synced');
        } catch (err) {
          console.warn('⚠️ [DELETE] Failed to sync deletion:', err);
          setSyncState('error');
          setError('Delete failed to sync - entry removed locally');
        }
      }

      return true;
    } catch (err) {
      console.error('💥 [DELETE] Failed to delete entry:', err);
      setError(err instanceof Error ? err.message : 'Failed to delete entry');
      return false;
    }
  }, [user?.uid, isAuthenticated, entries, saveToLocalStorage]);

  // Manual sync trigger for UI
  const manualSync = useCallback(async (): Promise<boolean> => {
    if (!isAuthenticated || !user?.uid) {
      setError('User must be authenticated to sync');
      return false;
    }

    try {
      setError(null);
      setSyncState('syncing');
      
      // Clear any pending debounced syncs
      if (syncTimeoutRef.current) {
        clearTimeout(syncTimeoutRef.current);
      }
      
      console.log('🔄 [MANUAL-SYNC] Starting manual sync');
      
      // Sync all local entries using atomic upsert
      for (const entry of entries) {
        if (entry.uid === user.uid || entry.uid === 'local-user') {
          await FirestoreService.upsertEntry(entry, user.uid);
          // Update tracking after manual sync
          lastSyncedContentRef.current.set(entry.id, entry.content);
        }
      }
      
      // Then sync from remote to get any changes
      const mergedEntries = await SyncService.syncFromRemote(user.uid);
      setEntries(mergedEntries);
      saveToLocalStorage(mergedEntries);
      
      // Update tracking after remote sync
      mergedEntries.forEach(entry => {
        lastSyncedContentRef.current.set(entry.id, entry.content);
      });
      
      console.log('✅ [MANUAL-SYNC] Manual sync completed');
      setSyncState('synced');
      return true;
    } catch (err) {
      console.error('💥 [MANUAL-SYNC] Manual sync failed:', err);
      setError(err instanceof Error ? err.message : 'Manual sync failed');
      setSyncState('error');
      return false;
    }
  }, [user?.uid, isAuthenticated, entries, saveToLocalStorage]);

  // Cleanup timeout on unmount
  useEffect(() => {
    return () => {
      if (syncTimeoutRef.current) {
        clearTimeout(syncTimeoutRef.current);
      }
    };
  }, []);

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