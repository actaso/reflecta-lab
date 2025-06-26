'use client';

import { JournalEntry, STORAGE_KEYS, SyncStatus } from '@/types/journal';
import { MigrationService } from './migrationService';

/**
 * Generate a UUID v4
 */
function generateUUID(): string {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
    const r = Math.random() * 16 | 0;
    const v = c === 'x' ? r : (r & 0x3 | 0x8);
    return v.toString(16);
  });
}

/**
 * Generate entry ID based on authentication state
 */
export function generateEntryId(userId?: string): string {
  const uuid = generateUUID();
  return userId ? `${userId}-${uuid}` : uuid;
}

/**
 * Extract UUID from composite ID
 */
export function extractUuid(id: string): string {
  const parts = id.split('-');
  // If it's a composite ID (userId-uuid), take everything after first dash
  // If it's just a UUID, return as-is
  return parts.length > 5 ? parts.slice(1).join('-') : id;
}

/**
 * Extract user ID from composite ID
 */
export function extractUserId(id: string): string | undefined {
  const parts = id.split('-');
  // If it's a composite ID and has more than 5 parts (UUID has 5), first part is userId
  return parts.length > 5 ? parts[0] : undefined;
}

/**
 * Convert anonymous entry ID to authenticated ID
 */
export function migrateEntryId(anonymousId: string, userId: string): string {
  // If already has userId prefix, return as-is
  if (anonymousId.startsWith(`${userId}-`)) {
    return anonymousId;
  }
  // Add userId prefix to existing UUID
  return `${userId}-${anonymousId}`;
}

/**
 * Enhanced localStorage service for journal entries
 */
export class LocalStorageService {
  /**
   * Load all entries from localStorage
   */
  static loadEntries(): Record<string, JournalEntry[]> {
    if (typeof window === 'undefined') return {};
    
    // Run migration before loading entries
    MigrationService.checkAndMigrate();
    
    try {
      const stored = localStorage.getItem(STORAGE_KEYS.ENTRIES);
      if (!stored) return {};
      
      const parsed = JSON.parse(stored);
      
      // Convert date strings back to Date objects
      Object.keys(parsed).forEach(dateKey => {
        parsed[dateKey] = parsed[dateKey].map((entry: any) => {
          const hydratedEntry: JournalEntry = {
            ...entry,
            timestamp: new Date(entry.timestamp),
            createdAt: new Date(entry.createdAt),
            updatedAt: entry.updatedAt ? new Date(entry.updatedAt) : undefined,
            syncedAt: entry.syncedAt ? new Date(entry.syncedAt) : undefined,
          };
          
          return hydratedEntry;
        });
      });
      
      console.log(`📱 Loaded ${Object.values(parsed).flat().length} entries from localStorage`);
      return parsed;
    } catch (error) {
      console.error('Failed to load entries from localStorage:', error);
      return {};
    }
  }

  /**
   * Save all entries to localStorage
   */
  static saveEntries(entries: Record<string, JournalEntry[]>): void {
    if (typeof window === 'undefined') return;
    
    try {
      localStorage.setItem(STORAGE_KEYS.ENTRIES, JSON.stringify(entries));
    } catch (error) {
      console.error('Failed to save entries to localStorage:', error);
    }
  }

  /**
   * Add a new entry
   */
  static addEntry(
    entries: Record<string, JournalEntry[]>,
    content: string,
    userId?: string
  ): { entries: Record<string, JournalEntry[]>; entry: JournalEntry } {
    const now = new Date();
    const id = generateEntryId(userId);
    const dateKey = now.toISOString().split('T')[0];

    const newEntry: JournalEntry = {
      id,
      timestamp: now,
      content,
      userId,
      synced: false,
      createdAt: now,
      pendingSync: !!userId, // Only pending sync if user is authenticated
    };

    const updatedEntries = { ...entries };
    if (!updatedEntries[dateKey]) {
      updatedEntries[dateKey] = [];
    }
    updatedEntries[dateKey] = [newEntry, ...updatedEntries[dateKey]];

    this.saveEntries(updatedEntries);
    return { entries: updatedEntries, entry: newEntry };
  }

  /**
   * Update an existing entry
   */
  static updateEntry(
    entries: Record<string, JournalEntry[]>,
    entryId: string,
    content: string
  ): Record<string, JournalEntry[]> {
    const now = new Date();
    const updatedEntries = { ...entries };

    // Find and update the entry
    for (const dateKey in updatedEntries) {
      const entryIndex = updatedEntries[dateKey].findIndex(e => e.id === entryId);
      if (entryIndex !== -1) {
        const currentEntry = updatedEntries[dateKey][entryIndex];
        updatedEntries[dateKey][entryIndex] = {
          ...currentEntry,
          content,
          updatedAt: now,
          pendingSync: !!currentEntry.userId, // Mark as pending sync if authenticated
          synced: false, // No longer synced after update
        };
        break;
      }
    }

    this.saveEntries(updatedEntries);
    return updatedEntries;
  }

  /**
   * Delete an entry
   */
  static deleteEntry(
    entries: Record<string, JournalEntry[]>,
    entryId: string
  ): Record<string, JournalEntry[]> {
    const updatedEntries = { ...entries };

    // Find and remove the entry
    for (const dateKey in updatedEntries) {
      updatedEntries[dateKey] = updatedEntries[dateKey].filter(e => e.id !== entryId);
      if (updatedEntries[dateKey].length === 0) {
        delete updatedEntries[dateKey];
      }
    }

    this.saveEntries(updatedEntries);
    return updatedEntries;
  }

  /**
   * Migrate anonymous entries to authenticated format
   */
  static migrateToAuthenticatedUser(
    entries: Record<string, JournalEntry[]>,
    userId: string
  ): Record<string, JournalEntry[]> {
    console.log('🔄 Migrating anonymous entries to authenticated user:', userId);
    
    const now = new Date();
    const updatedEntries = { ...entries };
    let migratedCount = 0;

    // Update all entries to have userId and new composite IDs
    Object.keys(updatedEntries).forEach(dateKey => {
      updatedEntries[dateKey] = updatedEntries[dateKey].map(entry => {
        // Skip if already has this userId
        if (entry.userId === userId) {
          return entry;
        }

        migratedCount++;
        const newId = migrateEntryId(entry.id, userId);
        
        return {
          ...entry,
          id: newId,
          userId,
          updatedAt: now,
          pendingSync: true, // Mark for sync to Firestore
          synced: false,
        };
      });
    });

    console.log(`✅ Migrated ${migratedCount} entries to user ${userId}`);
    this.saveEntries(updatedEntries);
    return updatedEntries;
  }

  /**
   * Mark entry as synced
   */
  static markAsSynced(
    entries: Record<string, JournalEntry[]>,
    entryId: string
  ): Record<string, JournalEntry[]> {
    const now = new Date();
    const updatedEntries = { ...entries };

    for (const dateKey in updatedEntries) {
      const entryIndex = updatedEntries[dateKey].findIndex(e => e.id === entryId);
      if (entryIndex !== -1) {
        updatedEntries[dateKey][entryIndex] = {
          ...updatedEntries[dateKey][entryIndex],
          synced: true,
          pendingSync: false,
          syncedAt: now,
          syncError: undefined,
        };
        break;
      }
    }

    this.saveEntries(updatedEntries);
    return updatedEntries;
  }

  /**
   * Mark entry as sync failed
   */
  static markSyncError(
    entries: Record<string, JournalEntry[]>,
    entryId: string,
    error: string
  ): Record<string, JournalEntry[]> {
    const updatedEntries = { ...entries };

    for (const dateKey in updatedEntries) {
      const entryIndex = updatedEntries[dateKey].findIndex(e => e.id === entryId);
      if (entryIndex !== -1) {
        updatedEntries[dateKey][entryIndex] = {
          ...updatedEntries[dateKey][entryIndex],
          syncError: error,
          pendingSync: true, // Keep marked for retry
        };
        break;
      }
    }

    this.saveEntries(updatedEntries);
    return updatedEntries;
  }

  /**
   * Get entries that need syncing
   */
  static getPendingSyncEntries(entries: Record<string, JournalEntry[]>): JournalEntry[] {
    const pending: JournalEntry[] = [];
    
    Object.values(entries).forEach(dayEntries => {
      dayEntries.forEach(entry => {
        if (entry.pendingSync && entry.userId) {
          pending.push(entry);
        }
      });
    });

    return pending;
  }

  /**
   * Load sync status
   */
  static loadSyncStatus(): SyncStatus {
    if (typeof window === 'undefined') {
      return {
        isOnline: true,
        isSyncing: false,
        pendingCount: 0,
        hasErrors: false,
        errors: [],
      };
    }

    try {
      const stored = localStorage.getItem(STORAGE_KEYS.SYNC_STATUS);
      if (!stored) {
        return {
          isOnline: navigator.onLine,
          isSyncing: false,
          pendingCount: 0,
          hasErrors: false,
          errors: [],
        };
      }

      const parsed = JSON.parse(stored);
      return {
        ...parsed,
        lastSyncTime: parsed.lastSyncTime ? new Date(parsed.lastSyncTime) : undefined,
        isOnline: navigator.onLine, // Always use current online status
        isSyncing: false, // Reset syncing status on page load
      };
    } catch (error) {
      console.error('Failed to load sync status:', error);
      return {
        isOnline: navigator.onLine,
        isSyncing: false,
        pendingCount: 0,
        hasErrors: false,
        errors: [],
      };
    }
  }

  /**
   * Save sync status
   */
  static saveSyncStatus(status: SyncStatus): void {
    if (typeof window === 'undefined') return;

    try {
      localStorage.setItem(STORAGE_KEYS.SYNC_STATUS, JSON.stringify(status));
    } catch (error) {
      console.error('Failed to save sync status:', error);
    }
  }
}