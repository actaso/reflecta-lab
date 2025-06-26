'use client';

import {
  collection,
  doc,
  getDocs,
  setDoc,
  query,
  where,
  orderBy,
  Timestamp,
} from 'firebase/firestore';
import { getFirestoreDbAsync, isFirebaseConfigured, getFirebaseAuth } from './firebase';
import { LocalStorageService } from './localStorage';
import { JournalEntry, FirestoreJournalEntry, SyncResult, SyncError } from '@/types/journal';

/**
 * Comprehensive sync service for localStorage ↔ Firestore
 */
export class SyncService {
  private static retryAttempts = new Map<string, number>();
  private static maxRetries = 3;
  private static retryDelay = 1000; // Start with 1 second

  /**
   * Main sync function - called when user authenticates
   */
  static async syncOnAuthentication(
    userId: string,
    localEntries: Record<string, JournalEntry[]>
  ): Promise<{ 
    entries: Record<string, JournalEntry[]>; 
    result: SyncResult 
  }> {
    console.log('🔄 Starting sync for authenticated user:', userId);
    
    if (!isFirebaseConfigured()) {
      console.error('❌ Firebase not configured, skipping sync');
      return { 
        entries: localEntries, 
        result: { 
          success: false, 
          entriesUploaded: 0, 
          entriesDownloaded: 0, 
          conflicts: 0, 
          errors: [{ entryId: '', operation: 'upload', error: 'Firebase not configured', retryCount: 0 }] 
        } 
      };
    }

    try {
      // Check Firebase authentication status
      const auth = getFirebaseAuth();
      const currentUser = auth.currentUser;
      console.log('🔐 Firebase auth user:', currentUser?.uid);
      
      if (!currentUser) {
        console.warn('⚠️ No Firebase authenticated user found for sync');
        return { 
          entries: localEntries, 
          result: { 
            success: false, 
            entriesUploaded: 0, 
            entriesDownloaded: 0, 
            conflicts: 0, 
            errors: [{ entryId: '', operation: 'upload', error: 'No Firebase authenticated user', retryCount: 0 }] 
          } 
        };
      }
      
      // Step 1: Migrate anonymous entries to authenticated format
      const migratedEntries = LocalStorageService.migrateToAuthenticatedUser(localEntries, userId);

      // Step 2: Fetch remote entries
      console.log('📥 Fetching remote entries...');
      const remoteEntries = await this.fetchRemoteEntries(userId);
      console.log(`📥 Found ${remoteEntries.length} remote entries`);

      // Step 3: Perform bidirectional sync
      const syncResult = await this.performBidirectionalSync(migratedEntries, remoteEntries, userId);

      console.log('✅ Sync completed:', syncResult);
      return { entries: syncResult.localEntries, result: syncResult.result };

    } catch (error) {
      console.error('❌ Sync failed:', error);
      return { 
        entries: localEntries, 
        result: { 
          success: false, 
          entriesUploaded: 0, 
          entriesDownloaded: 0, 
          conflicts: 0, 
          errors: [{ entryId: '', operation: 'upload', error: error instanceof Error ? error.message : 'Unknown error', retryCount: 0 }] 
        } 
      };
    }
  }

  /**
   * Fetch all remote entries for a user
   */
  private static async fetchRemoteEntries(userId: string): Promise<JournalEntry[]> {
    const db = await getFirestoreDbAsync();
    console.log(`🔍 Firestore project ID: ${db.app.options.projectId}`);
    
    
    const entriesRef = collection(db, 'entries');
    
    const q = query(
      entriesRef,
      where('userId', '==', userId),
      orderBy('timestamp', 'desc')
    );

    const snapshot = await getDocs(q);
    const remoteEntries: JournalEntry[] = [];

    snapshot.forEach((doc) => {
      const data = doc.data() as FirestoreJournalEntry;
      remoteEntries.push({
        id: doc.id, // This is the document ID
        timestamp: data.timestamp instanceof Timestamp ? data.timestamp.toDate() : new Date(data.timestamp),
        content: data.content,
        userId: data.userId,
        synced: true,
        createdAt: data.createdAt instanceof Timestamp ? data.createdAt.toDate() : new Date(data.createdAt),
        updatedAt: data.updatedAt instanceof Timestamp ? data.updatedAt.toDate() : new Date(data.updatedAt),
        syncedAt: data.syncedAt instanceof Timestamp ? data.syncedAt.toDate() : new Date(data.syncedAt),
      });
    });

    return remoteEntries;
  }

  /**
   * Perform bidirectional sync with conflict resolution
   */
  private static async performBidirectionalSync(
    localEntries: Record<string, JournalEntry[]>,
    remoteEntries: JournalEntry[],
    userId: string
  ): Promise<{ localEntries: Record<string, JournalEntry[]>; result: SyncResult }> {
    const errors: SyncError[] = [];
    let uploadCount = 0;
    let downloadCount = 0;
    let conflictCount = 0;

    // Create lookup maps for efficient comparison
    const localLookup = new Map<string, JournalEntry>();
    const remoteLookup = new Map<string, JournalEntry>();

    // Build local lookup (by ID for comparison)
    Object.values(localEntries).flat().forEach(entry => {
      localLookup.set(entry.id, entry);
    });

    // Build remote lookup
    remoteEntries.forEach(entry => {
      remoteLookup.set(entry.id, entry);
    });

    // Step 1: Upload local entries not in remote or newer than remote
    console.log('⬆️ Uploading local entries...');
    for (const [id, localEntry] of localLookup) {
      const remoteEntry = remoteLookup.get(id);

      if (!remoteEntry) {
        // Entry doesn't exist remotely, upload it
        const success = await this.uploadEntry(localEntry);
        if (success) {
          uploadCount++;
          // Mark as synced in local storage
          localEntries = LocalStorageService.markAsSynced(localEntries, localEntry.id);
        } else {
          errors.push({
            entryId: localEntry.id,
            operation: 'upload',
            error: 'Failed to upload entry',
            retryCount: this.retryAttempts.get(localEntry.id) || 0,
          });
        }
      } else {
        // Entry exists remotely, check for conflicts
        const localUpdated = localEntry.updatedAt || localEntry.createdAt;
        const remoteUpdated = remoteEntry.updatedAt || remoteEntry.createdAt;

        if (localUpdated > remoteUpdated) {
          // Local is newer, upload
          console.log(`🔄 Local entry ${id} is newer, uploading...`);
          const success = await this.uploadEntry(localEntry);
          if (success) {
            uploadCount++;
            conflictCount++;
            localEntries = LocalStorageService.markAsSynced(localEntries, localEntry.id);
          } else {
            errors.push({
              entryId: localEntry.id,
              operation: 'upload',
              error: 'Failed to upload newer local entry',
              retryCount: this.retryAttempts.get(localEntry.id) || 0,
            });
          }
        } else if (remoteUpdated > localUpdated) {
          // Remote is newer, will be handled in download step
          conflictCount++;
        }
        // If timestamps are equal, no action needed
      }
    }

    // Step 2: Download remote entries not in local or newer than local
    console.log('⬇️ Downloading remote entries...');
    for (const [id, remoteEntry] of remoteLookup) {
      const localEntry = localLookup.get(id);

      if (!localEntry) {
        // Entry doesn't exist locally, download it
        localEntries = this.addRemoteEntryToLocal(localEntries, remoteEntry);
        downloadCount++;
      } else {
        // Check if remote is newer (conflict resolution)
        const localUpdated = localEntry.updatedAt || localEntry.createdAt;
        const remoteUpdated = remoteEntry.updatedAt || remoteEntry.createdAt;

        if (remoteUpdated > localUpdated) {
          // Remote is newer, overwrite local
          console.log(`🔄 Remote entry ${id} is newer, downloading...`);
          localEntries = this.updateLocalEntryFromRemote(localEntries, localEntry.id, remoteEntry);
          downloadCount++;
        }
      }
    }

    // Save updated entries to localStorage
    LocalStorageService.saveEntries(localEntries);

    const result: SyncResult = {
      success: errors.length === 0,
      entriesUploaded: uploadCount,
      entriesDownloaded: downloadCount,
      conflicts: conflictCount,
      errors,
    };

    return { localEntries, result };
  }

  /**
   * Upload a single entry to Firestore
   */
  private static async uploadEntry(entry: JournalEntry): Promise<boolean> {
    try {
      const db = await getFirestoreDbAsync();
      const docRef = doc(db, 'entries', entry.id);

      const firestoreData: FirestoreJournalEntry = {
        userId: entry.userId!,
        timestamp: entry.timestamp,
        content: entry.content,
        createdAt: entry.createdAt,
        updatedAt: entry.updatedAt || entry.createdAt,
        syncedAt: new Date(),
      };


      await setDoc(docRef, firestoreData);
      console.log(`✅ Uploaded entry ${entry.id}`);
      
      // Reset retry count on success
      this.retryAttempts.delete(entry.id);
      
      return true;
    } catch (error) {
      console.error(`❌ Failed to upload entry ${entry.id}:`, error);
      
      // Increment retry count
      const currentRetries = this.retryAttempts.get(entry.id) || 0;
      this.retryAttempts.set(entry.id, currentRetries + 1);
      
      return false;
    }
  }

  /**
   * Add remote entry to local storage
   */
  private static addRemoteEntryToLocal(
    localEntries: Record<string, JournalEntry[]>,
    remoteEntry: JournalEntry
  ): Record<string, JournalEntry[]> {
    const dateKey = remoteEntry.timestamp.toISOString().split('T')[0];
    const updatedEntries = { ...localEntries };

    if (!updatedEntries[dateKey]) {
      updatedEntries[dateKey] = [];
    }

    // Add entry with synced status
    const localEntry: JournalEntry = {
      ...remoteEntry,
      synced: true,
      pendingSync: false,
    };

    updatedEntries[dateKey] = [localEntry, ...updatedEntries[dateKey]];
    
    // Sort by timestamp (newest first)
    updatedEntries[dateKey].sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime());

    console.log(`📥 Added remote entry ${remoteEntry.uid} to local storage`);
    return updatedEntries;
  }

  /**
   * Update local entry from remote (conflict resolution)
   */
  private static updateLocalEntryFromRemote(
    localEntries: Record<string, JournalEntry[]>,
    localEntryId: string,
    remoteEntry: JournalEntry
  ): Record<string, JournalEntry[]> {
    const updatedEntries = { ...localEntries };

    // Find and update the local entry
    for (const dateKey in updatedEntries) {
      const entryIndex = updatedEntries[dateKey].findIndex(e => e.id === localEntryId);
      if (entryIndex !== -1) {
        updatedEntries[dateKey][entryIndex] = {
          ...remoteEntry,
          synced: true,
          pendingSync: false,
        };
        console.log(`🔄 Updated local entry ${remoteEntry.uid} from remote`);
        break;
      }
    }

    return updatedEntries;
  }

  /**
   * Retry failed sync operations
   */
  static async retryFailedSyncs(
    entries: Record<string, JournalEntry[]>,
    _userId: string
  ): Promise<Record<string, JournalEntry[]>> {
    console.log('🔄 Retrying failed syncs...');
    
    const pendingEntries = LocalStorageService.getPendingSyncEntries(entries);
    const entriesToRetry = pendingEntries.filter(entry => {
      const retryCount = this.retryAttempts.get(entry.id) || 0;
      return retryCount < this.maxRetries;
    });

    let updatedEntries = entries;

    for (const entry of entriesToRetry) {
      const success = await this.uploadEntry(entry);
      if (success) {
        updatedEntries = LocalStorageService.markAsSynced(updatedEntries, entry.id);
      } else {
        updatedEntries = LocalStorageService.markSyncError(
          updatedEntries,
          entry.id,
          'Retry failed'
        );
      }
      
      // Add delay between retries
      await new Promise(resolve => setTimeout(resolve, this.retryDelay));
    }

    return updatedEntries;
  }

  /**
   * Check online status and connectivity to Firebase
   */
  static async checkConnectivity(): Promise<boolean> {
    if (!navigator.onLine) {
      return false;
    }

    try {
      // Simple connectivity check by attempting to read from Firestore
      const db = await getFirestoreDbAsync();
      const testCollection = collection(db, 'entries');
      await getDocs(query(testCollection, where('__test', '==', true)));
      return true;
    } catch (error) {
      console.warn('Firebase connectivity check failed:', error);
      return false;
    }
  }

  /**
   * Get sync statistics
   */
  static getSyncStats(entries: Record<string, JournalEntry[]>): {
    total: number;
    synced: number;
    pending: number;
    errors: number;
  } {
    const allEntries = Object.values(entries).flat();
    
    return {
      total: allEntries.length,
      synced: allEntries.filter(e => e.synced).length,
      pending: allEntries.filter(e => e.pendingSync && e.userId).length, // Only count authenticated user entries
      errors: allEntries.filter(e => e.syncError && e.userId).length, // Only count authenticated user entries
    };
  }
}