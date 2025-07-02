import { JournalEntry } from '@/types/journal';
import { FirestoreService } from '@/lib/firestore';

export type SyncState = 'synced' | 'syncing' | 'offline' | 'conflict' | 'error';

export interface SyncQueueItem {
  entry: JournalEntry;
  operation: 'create' | 'update' | 'delete';
  retryCount: number;
  lastAttempt?: Date;
}

export class SyncService {
  private static syncQueue: SyncQueueItem[] = [];
  private static maxRetries = 3;
  private static retryDelays = [1000, 3000, 10000]; // Progressive backoff

  /**
   * Sync a single entry to Firestore
   * Called after local updates to push changes to the server
   */
  static async syncEntryToRemote(entry: JournalEntry, userId: string): Promise<{ synced: boolean; conflict?: JournalEntry }> {
    console.log('🔄 [SYNC-SERVICE] syncEntryToRemote called for entry:', entry.id);
    
    try {
      // First, try to update the entry (most common case for existing entries)
      console.log('📝 [SYNC-SERVICE] Attempting UPDATE first for entry:', entry.id);
      try {
        await FirestoreService.updateEntry(entry.id, entry, userId);
        console.log('✅ [SYNC-SERVICE] UPDATE successful for entry:', entry.id);
        return { synced: true };
      } catch (updateError) {
        console.warn('❌ [SYNC-SERVICE] UPDATE failed, trying CREATE:', updateError);
        // Update failed - either entry doesn't exist or there's another issue
        // Try to create it (handles new entries)
        try {
          await FirestoreService.addEntry(entry, userId);
          console.log('✅ [SYNC-SERVICE] CREATE successful after UPDATE failure for entry:', entry.id);
          return { synced: true };
        } catch (createError) {
          console.error('❌ [SYNC-SERVICE] Both UPDATE and CREATE failed, checking for conflicts:', createError);
          // Both update and create failed - this suggests the entry exists but there might be a conflict
          // Now we need to fetch the remote entry to check for conflicts
          console.warn('Both update and create failed, checking for conflicts...');
          
          const remoteEntries = await FirestoreService.getUserEntries(userId);
          const remoteEntry = remoteEntries.find(e => e.id === entry.id);
          
          if (remoteEntry) {
            console.log('🔍 [SYNC-SERVICE] Remote entry found, resolving conflict for:', entry.id);
            // There's a conflict - resolve it
            const resolvedEntry = this.resolveConflict(entry, remoteEntry);
            
            if (resolvedEntry.id === entry.id && resolvedEntry.lastUpdated.getTime() === entry.lastUpdated.getTime()) {
              console.log('🏆 [SYNC-SERVICE] Local wins conflict resolution, forcing update:', entry.id);
              // Local wins - force update
              await FirestoreService.updateEntry(entry.id, entry, userId);
              return { synced: true };
            } else {
              console.log('🏆 [SYNC-SERVICE] Remote wins conflict resolution:', entry.id);
              // Remote wins - return conflict for handling by caller
              return { synced: false, conflict: remoteEntry };
            }
          } else {
            console.error('💥 [SYNC-SERVICE] Entry does not exist remotely but CREATE failed - unexpected state');
            // Entry doesn't exist remotely, but create failed - this is unexpected
            throw createError;
          }
        }
      }
    } catch (error) {
      console.error('💥 [SYNC-SERVICE] Failed to sync entry to remote:', error);
      throw error;
    }
  }

  /**
   * Pull all entries from Firestore and merge with local storage
   * Called on app startup when user is authenticated
   */
  static async syncFromRemote(userId: string): Promise<JournalEntry[]> {
    try {
      const remoteEntries = await FirestoreService.getUserEntries(userId);
      const localEntries = this.getLocalEntries();
      
      const mergedEntries = this.mergeEntries(localEntries, remoteEntries);
      
      // Update localStorage with merged entries
      this.saveLocalEntries(mergedEntries);
      
      return mergedEntries;
    } catch (error) {
      console.error('Failed to sync from remote:', error);
      throw error;
    }
  }

  /**
   * Resolve conflicts between local and remote entries using lastUpdated timestamp
   * Simple last-write-wins strategy
   */
  static resolveConflict(localEntry: JournalEntry, remoteEntry: JournalEntry): JournalEntry {
    // If remote entry was updated more recently, it wins
    if (remoteEntry.lastUpdated.getTime() > localEntry.lastUpdated.getTime()) {
      return remoteEntry;
    }
    
    // Otherwise, local entry wins (including ties)
    return localEntry;
  }

  /**
   * Merge local and remote entries, resolving conflicts
   */
  private static mergeEntries(localEntries: JournalEntry[], remoteEntries: JournalEntry[]): JournalEntry[] {
    const mergedMap = new Map<string, JournalEntry>();
    
    // Add all local entries to the map
    localEntries.forEach(entry => {
      mergedMap.set(entry.id, entry);
    });
    
    // Process remote entries - either add new ones or resolve conflicts
    remoteEntries.forEach(remoteEntry => {
      const localEntry = mergedMap.get(remoteEntry.id);
      
      if (localEntry) {
        // Conflict resolution needed
        const resolvedEntry = this.resolveConflict(localEntry, remoteEntry);
        mergedMap.set(remoteEntry.id, resolvedEntry);
      } else {
        // New entry from remote
        mergedMap.set(remoteEntry.id, remoteEntry);
      }
    });
    
    return Array.from(mergedMap.values());
  }

  /**
   * Get entries from localStorage
   */
  private static getLocalEntries(): JournalEntry[] {
    try {
      const savedEntries = localStorage.getItem('journal-entries');
      if (!savedEntries) return [];
      
      const parsed = JSON.parse(savedEntries);
      const allEntries: JournalEntry[] = [];
      
      // Convert the date-keyed format back to flat array
      Object.values(parsed).forEach((dayEntries: any) => {
        dayEntries.forEach((entry: any) => {
          allEntries.push({
            id: entry.id as string,
            timestamp: new Date(entry.timestamp as string),
            content: entry.content as string,
            uid: entry.uid as string,
            lastUpdated: new Date(entry.lastUpdated as string)
          });
        });
      });
      
      return allEntries;
    } catch (error) {
      console.error('Failed to load local entries:', error);
      return [];
    }
  }

  /**
   * Save entries to localStorage in the expected format
   */
  private static saveLocalEntries(entries: JournalEntry[]): void {
    try {
      // Convert back to date-keyed format for compatibility
      const entriesByDate: Record<string, JournalEntry[]> = {};
      
      entries.forEach(entry => {
        const dateKey = entry.timestamp.toISOString().split('T')[0]; // YYYY-MM-DD
        if (!entriesByDate[dateKey]) {
          entriesByDate[dateKey] = [];
        }
        entriesByDate[dateKey].push(entry);
      });
      
      // Sort entries within each day by timestamp (newest first)
      Object.keys(entriesByDate).forEach(dateKey => {
        entriesByDate[dateKey].sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime());
      });
      
      localStorage.setItem('journal-entries', JSON.stringify(entriesByDate));
    } catch (error) {
      console.error('Failed to save local entries:', error);
    }
  }

  /**
   * Add an entry to the sync queue for retry later
   */
  static queueForSync(entry: JournalEntry, operation: 'create' | 'update' | 'delete'): void {
    const queueItem: SyncQueueItem = {
      entry,
      operation,
      retryCount: 0
    };
    
    this.syncQueue.push(queueItem);
  }

  /**
   * Process the sync queue - attempt to sync failed items
   */
  static async processQueue(userId: string): Promise<{ conflicts: JournalEntry[] }> {
    const itemsToRetry = [...this.syncQueue];
    this.syncQueue = []; // Clear queue before processing
    const conflicts: JournalEntry[] = [];
    
    for (const item of itemsToRetry) {
      if (item.retryCount >= this.maxRetries) {
        console.warn('Max retries reached for entry:', item.entry.id);
        continue;
      }
      
      try {
        const result = await this.syncEntryToRemote(item.entry, userId);
        
        if (result.synced) {
          // Success - don't re-queue
          console.log('Successfully synced queued entry:', item.entry.id);
        } else if (result.conflict) {
          // Conflict detected - add to conflicts list for handling
          conflicts.push(result.conflict);
        }
      } catch (error) {
        // Failed - re-queue with increased retry count and exponential backoff
        item.retryCount++;
        item.lastAttempt = new Date();
        
        // Add delay before next retry
        const delay = this.retryDelays[Math.min(item.retryCount - 1, this.retryDelays.length - 1)];
        setTimeout(() => {
          this.syncQueue.push(item);
        }, delay);
      }
    }
    
    return { conflicts };
  }
} 