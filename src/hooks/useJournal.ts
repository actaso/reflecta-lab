import { useState, useEffect, useCallback, useRef } from 'react';
import { JournalEntry, ImageMetadata } from '@/types/journal';
import { FirestoreService } from '@/lib/firestore';
import { SyncService, SyncState } from '@/services/syncService';
import { useFirebaseAuth } from './useFirebaseAuth';

export const useJournal = () => {
  const { user, isAuthenticated } = useFirebaseAuth();
  const [entries, setEntries] = useState<JournalEntry[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [syncState, setSyncState] = useState<SyncState>('offline');
  const [conflicts] = useState<JournalEntry[]>([]);
  
  // Enhanced debouncing with content change detection
  const syncTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const lastSyncedContentRef = useRef<Map<string, string>>(new Map()); // Track last synced content per entry
  const previousAuthStateRef = useRef<boolean>(false); // Track previous auth state for transitions
  const SYNC_DEBOUNCE_MS = 1500; // Slightly longer debounce

  // Helper function to extract image URLs from HTML content
  const extractImageUrls = useCallback((content: string): string[] => {
    const parser = new DOMParser();
    const doc = parser.parseFromString(content, 'text/html');
    const images = doc.querySelectorAll('img');
    return Array.from(images).map(img => img.src).filter(src => src);
  }, []);

  // Helper function to update image metadata for an entry
  const updateImageMetadata = useCallback((entry: JournalEntry, imageMetadata: ImageMetadata): JournalEntry => {
    const currentImages = entry.images || [];
    const existingIndex = currentImages.findIndex(img => img.filename === imageMetadata.filename);
    
    let updatedImages: ImageMetadata[];
    if (existingIndex >= 0) {
      // Update existing image metadata
      updatedImages = [...currentImages];
      updatedImages[existingIndex] = imageMetadata;
    } else {
      // Add new image metadata
      updatedImages = [...currentImages, imageMetadata];
    }
    
    return {
      ...entry,
      images: updatedImages,
      lastUpdated: new Date()
    };
  }, []);

  // Helper function to clean up unused image metadata
  const cleanupImageMetadata = useCallback((entry: JournalEntry): JournalEntry => {
    if (!entry.images || entry.images.length === 0) return entry;
    
    const contentImageUrls = extractImageUrls(entry.content);
    const usedImages = entry.images.filter(img => contentImageUrls.includes(img.url));
    
    if (usedImages.length !== entry.images.length) {
      return {
        ...entry,
        images: usedImages,
        lastUpdated: new Date()
      };
    }
    
    return entry;
  }, [extractImageUrls]);

  // Helper function to load entries from localStorage
  const loadLocalEntriesFromStorage = useCallback((): JournalEntry[] => {
    try {
      const savedEntries = localStorage.getItem('journal-entries');
      if (!savedEntries) return [];
      
      // Guard against invalid JSON in test environment
      if (savedEntries === 'undefined' || savedEntries === 'null') {
        return [];
      }
      
      const parsed = JSON.parse(savedEntries);
      const allEntries: JournalEntry[] = [];
      
      Object.values(parsed).forEach((dayEntries: unknown) => {
        (dayEntries as JournalEntry[]).forEach((entry: unknown) => {
          allEntries.push({
            id: (entry as JournalEntry).id,
            timestamp: new Date((entry as JournalEntry).timestamp),
            content: (entry as JournalEntry).content,
            uid: (entry as JournalEntry).uid || 'local-user',
            lastUpdated: (entry as JournalEntry).lastUpdated ? new Date((entry as JournalEntry).lastUpdated) : new Date((entry as JournalEntry).timestamp),
            images: (entry as JournalEntry).images?.map(img => ({
              ...img,
              uploadedAt: new Date(img.uploadedAt)
            })) || []
          });
        });
      });
      
      return allEntries;
    } catch (error) {
      console.error('Failed to load local entries:', error);
      // Clear corrupted data to prevent future errors
      if (typeof window !== 'undefined' && window.localStorage) {
        window.localStorage.removeItem('journal-entries');
      }
      return [];
    }
  }, []);

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

  // Handle the transition from anonymous to authenticated user
  const handleAnonymousToAuthenticatedTransition = useCallback(async () => {
    if (!user?.uid) return;

    setLoading(true);
    setError(null);
    setSyncState('syncing');

    try {
      // 1. Load existing local entries (anonymous entries)
      const localEntries = loadLocalEntriesFromStorage();
      const anonymousEntries = localEntries.filter(entry => entry.uid === 'local-user');
      
      console.log(`📝 [AUTH-TRANSITION] Found ${anonymousEntries.length} anonymous entries to preserve`);

      // 2. Fetch remote entries for this user
      let remoteEntries: JournalEntry[] = [];
      try {
        remoteEntries = await FirestoreService.getUserEntries(user.uid);
        console.log(`☁️ [AUTH-TRANSITION] Found ${remoteEntries.length} existing remote entries`);
      } catch (err) {
        console.warn('Failed to fetch existing remote entries, proceeding with local only:', err);
      }

      // 3. Update anonymous entries to belong to the authenticated user
      const updatedAnonymousEntries = anonymousEntries.map(entry => ({
        ...entry,
        uid: user.uid,
        lastUpdated: new Date() // Mark as recently updated for sync priority
      }));

      // 4. Merge all entries (remote + converted anonymous)
      const mergedEntries = [...remoteEntries, ...updatedAnonymousEntries];
      
      // 5. Update state and localStorage
      setEntries(mergedEntries);
      saveToLocalStorage(mergedEntries);

      // 6. Initialize content tracking
      mergedEntries.forEach(entry => {
        lastSyncedContentRef.current.set(entry.id, entry.content);
      });

      // 7. Sync anonymous entries to Firestore in background
      if (updatedAnonymousEntries.length > 0) {
        console.log(`🔄 [AUTH-TRANSITION] Syncing ${updatedAnonymousEntries.length} anonymous entries to Firestore`);
        
        try {
          // Use Promise.allSettled to attempt all syncs, don't fail on individual errors
          const syncResults = await Promise.allSettled(
            updatedAnonymousEntries.map(entry => 
              FirestoreService.upsertEntry(entry, user.uid)
            )
          );

          const successfulSyncs = syncResults.filter(result => result.status === 'fulfilled').length;
          const failedSyncs = syncResults.filter(result => result.status === 'rejected').length;

          console.log(`✅ [AUTH-TRANSITION] Sync complete: ${successfulSyncs} successful, ${failedSyncs} failed`);
          
          if (failedSyncs > 0) {
            setError(`Some entries failed to sync (${failedSyncs}/${updatedAnonymousEntries.length}) - they are saved locally`);
          }
        } catch (err) {
          console.error('Failed to sync anonymous entries:', err);
          setError('Failed to sync some entries - they are saved locally');
        }
      }

      setSyncState('synced');
      console.log('🎉 [AUTH-TRANSITION] Anonymous-to-authenticated transition complete');

    } catch (err) {
      console.error('Failed during anonymous-to-authenticated transition:', err);
      setError('Transition failed - working offline');
      setSyncState('error');
      
      // Fallback: just load local entries
      const localEntries = loadLocalEntriesFromStorage();
      setEntries(localEntries);
    } finally {
      setLoading(false);
    }
  }, [user?.uid, loadLocalEntriesFromStorage, saveToLocalStorage]);

  // Load entries from localStorage and sync when authenticated (standard behavior)
  const loadLocalEntries = useCallback(() => {
    try {
      const allEntries = loadLocalEntriesFromStorage();
      setEntries(allEntries);
      
      // Initialize last synced content tracking
      allEntries.forEach(entry => {
        lastSyncedContentRef.current.set(entry.id, entry.content);
      });

      // If authenticated, sync with Firestore in the background
      if (isAuthenticated && user?.uid) {
        setSyncState('syncing');
        
        const performBackgroundSync = async () => {
          try {
            // Sync from remote (pull changes) - pass current entries to avoid re-reading localStorage
            const mergedEntries = await SyncService.syncFromRemote(user.uid, allEntries);
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
    } catch (error) {
      console.error('Failed to load local entries:', error);
      setError('Failed to load entries from local storage');
    }
    setLoading(false);
  }, [isAuthenticated, user?.uid, loadLocalEntriesFromStorage]);

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

      // 2. Background sync for new entries using atomic upsert (only if authenticated)
      if (isAuthenticated && user?.uid) {
        setSyncState('syncing');
        
        // Don't await - let this happen in the background for fast UI response
        FirestoreService.upsertEntry(newEntry, user.uid)
          .then(() => {
            // Track this content as synced
            lastSyncedContentRef.current.set(newEntry.id, newEntry.content);
            console.log('✅ [ADD] New entry synced:', newEntry.id);
            setSyncState('synced');
          })
          .catch((err) => {
            console.warn('⚠️ [ADD] Background sync failed, will retry on edit:', err);
            setSyncState('error');
            // Don't set error state for the user since the entry was saved locally
          });
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
      const mergedEntries = await SyncService.syncFromRemote(user.uid, entries);
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

  // Handle authentication state changes and localStorage management
  useEffect(() => {
    const wasAuthenticated = previousAuthStateRef.current;
    const isNowAuthenticated = isAuthenticated;

    // Update the ref for next time
    previousAuthStateRef.current = isNowAuthenticated;

    // Case 1: User signed out (was authenticated, now not)
    if (wasAuthenticated && !isNowAuthenticated) {
      console.log('🔓 [AUTH] User signed out, clearing localStorage');
      localStorage.removeItem('journal-entries');
      setEntries([]);
      lastSyncedContentRef.current.clear();
      setSyncState('offline');
      setError(null);
      return; // Exit early, no need to load entries
    }

    // Case 2: User signed in (was not authenticated, now is)
    if (!wasAuthenticated && isNowAuthenticated && user?.uid) {
      console.log('🔐 [AUTH] User signed in, handling anonymous-to-authenticated transition');
      handleAnonymousToAuthenticatedTransition();
      return; // handleAnonymousToAuthenticatedTransition will load entries
    }

    // Case 3: Initial load or no auth state change
    loadLocalEntries();
  }, [isAuthenticated, user?.uid, handleAnonymousToAuthenticatedTransition, loadLocalEntries]);

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
    isAuthenticated,
    updateImageMetadata,
    cleanupImageMetadata
  };
};