'use client';

import { JournalEntry, STORAGE_KEYS } from '@/types/journal';
import { extractUuid } from './localStorage';

/**
 * Migration service for localStorage entries
 * Handles upgrading from old format to new format
 */
export class MigrationService {
  private static readonly MIGRATION_VERSION_KEY = 'reflecta-migration-version';
  private static readonly CURRENT_VERSION = 1;

  /**
   * Check if migration is needed and perform it
   */
  static checkAndMigrate(): void {
    if (typeof window === 'undefined') return;

    const currentVersion = this.getCurrentMigrationVersion();
    
    if (currentVersion < this.CURRENT_VERSION) {
      console.log(`🔄 Migrating localStorage from version ${currentVersion} to ${this.CURRENT_VERSION}`);
      this.performMigration(currentVersion);
      this.setMigrationVersion(this.CURRENT_VERSION);
      console.log('✅ Migration completed successfully');
    }
  }

  /**
   * Get current migration version
   */
  private static getCurrentMigrationVersion(): number {
    try {
      const version = localStorage.getItem(this.MIGRATION_VERSION_KEY);
      return version ? parseInt(version, 10) : 0;
    } catch {
      return 0;
    }
  }

  /**
   * Set migration version
   */
  private static setMigrationVersion(version: number): void {
    try {
      localStorage.setItem(this.MIGRATION_VERSION_KEY, version.toString());
    } catch (error) {
      console.warn('Failed to set migration version:', error);
    }
  }

  /**
   * Perform migration based on current version
   */
  private static performMigration(fromVersion: number): void {
    if (fromVersion < 1) {
      this.migrateToVersion1();
    }
    
    // Future migrations would go here:
    // if (fromVersion < 2) {
    //   this.migrateToVersion2();
    // }
  }

  /**
   * Migration to version 1: Add sync metadata to existing entries
   */
  private static migrateToVersion1(): void {
    console.log('🔄 Running migration to version 1...');
    
    try {
      // Check for entries in the current key
      const currentEntries = this.loadEntriesFromKey(STORAGE_KEYS.ENTRIES);
      
      if (currentEntries && Object.keys(currentEntries).length > 0) {
        console.log(`📦 Found ${Object.values(currentEntries).flat().length} entries to migrate`);
        const migratedEntries = this.addSyncMetadataToEntries(currentEntries);
        this.saveEntriesToKey(STORAGE_KEYS.ENTRIES, migratedEntries);
        console.log('✅ Current entries migrated successfully');
        return;
      }

      // Check for legacy entries (in case the key was different in old versions)
      const legacyKeys = [
        'journal-entries', // Current key
        'reflecta-entries', // Temporary key we used during development
        'entries', // Possible old key
      ];

      for (const legacyKey of legacyKeys) {
        if (legacyKey === STORAGE_KEYS.ENTRIES) continue; // Already checked above
        
        const legacyEntries = this.loadEntriesFromKey(legacyKey);
        if (legacyEntries && Object.keys(legacyEntries).length > 0) {
          console.log(`📦 Found ${Object.values(legacyEntries).flat().length} legacy entries in key '${legacyKey}'`);
          const migratedEntries = this.addSyncMetadataToEntries(legacyEntries);
          
          // Save to current key
          this.saveEntriesToKey(STORAGE_KEYS.ENTRIES, migratedEntries);
          
          // Remove legacy key to avoid confusion
          this.removeKey(legacyKey);
          
          console.log(`✅ Legacy entries migrated from '${legacyKey}' to '${STORAGE_KEYS.ENTRIES}'`);
          return;
        }
      }

      console.log('📭 No entries found to migrate');
    } catch (error) {
      console.error('❌ Migration to version 1 failed:', error);
      throw error;
    }
  }

  /**
   * Load entries from a specific localStorage key
   */
  private static loadEntriesFromKey(key: string): Record<string, any[]> | null {
    try {
      const stored = localStorage.getItem(key);
      if (!stored) return null;
      
      const parsed = JSON.parse(stored);
      
      // Validate that it looks like our entries structure
      if (typeof parsed === 'object' && parsed !== null) {
        // Check if it has date-like keys and array values
        const isValidEntries = Object.keys(parsed).some(key => {
          return Array.isArray(parsed[key]) && 
                 parsed[key].some((item: any) => 
                   item && typeof item === 'object' && 'id' in item && 'timestamp' in item && 'content' in item
                 );
        });
        
        if (isValidEntries) {
          return parsed;
        }
      }
      
      return null;
    } catch {
      return null;
    }
  }

  /**
   * Save entries to a specific localStorage key
   */
  private static saveEntriesToKey(key: string, entries: Record<string, JournalEntry[]>): void {
    try {
      localStorage.setItem(key, JSON.stringify(entries));
    } catch (error) {
      console.error(`Failed to save entries to key '${key}':`, error);
      throw error;
    }
  }

  /**
   * Remove a localStorage key
   */
  private static removeKey(key: string): void {
    try {
      localStorage.removeItem(key);
      console.log(`🗑️ Removed legacy key '${key}'`);
    } catch (error) {
      console.warn(`Failed to remove key '${key}':`, error);
    }
  }

  /**
   * Add sync metadata to existing entries
   */
  private static addSyncMetadataToEntries(
    entries: Record<string, any[]>
  ): Record<string, JournalEntry[]> {
    const migratedEntries: Record<string, JournalEntry[]> = {};
    
    Object.keys(entries).forEach(dateKey => {
      migratedEntries[dateKey] = entries[dateKey].map((entry: any) => {
        // Convert old format to new format
        const migratedEntry: JournalEntry = {
          id: entry.id || `migrated-${Date.now()}-${Math.random()}`,
          timestamp: new Date(entry.timestamp),
          content: entry.content || '',
          userId: entry.userId, // Will be undefined for old anonymous entries
          synced: entry.synced || false,
          createdAt: entry.createdAt ? new Date(entry.createdAt) : new Date(entry.timestamp),
          updatedAt: entry.updatedAt ? new Date(entry.updatedAt) : undefined,
          syncedAt: entry.syncedAt ? new Date(entry.syncedAt) : undefined,
          pendingSync: (entry.pendingSync || false) && !!entry.userId, // Only pending if has userId
          syncError: entry.syncError,
        };
        
        return migratedEntry;
      });
    });
    
    return migratedEntries;
  }

  /**
   * Get migration statistics
   */
  static getMigrationStats(): {
    currentVersion: number;
    migrationNeeded: boolean;
    entryCount: number;
  } {
    const currentVersion = this.getCurrentMigrationVersion();
    const migrationNeeded = currentVersion < this.CURRENT_VERSION;
    
    let entryCount = 0;
    try {
      const entries = this.loadEntriesFromKey(STORAGE_KEYS.ENTRIES);
      if (entries) {
        entryCount = Object.values(entries).flat().length;
      }
    } catch {
      // Ignore errors
    }
    
    return {
      currentVersion,
      migrationNeeded,
      entryCount,
    };
  }

  /**
   * Force a specific migration (for testing/debugging)
   */
  static forceMigration(toVersion: number = this.CURRENT_VERSION): void {
    console.log(`🔧 Forcing migration to version ${toVersion}`);
    this.setMigrationVersion(0); // Reset to trigger migration
    this.checkAndMigrate();
  }

  /**
   * Clear all migration data (for testing/debugging)
   */
  static clearMigrationData(): void {
    console.log('🧹 Clearing all migration data');
    try {
      localStorage.removeItem(this.MIGRATION_VERSION_KEY);
      localStorage.removeItem(STORAGE_KEYS.ENTRIES);
      localStorage.removeItem(STORAGE_KEYS.SYNC_STATUS);
      localStorage.removeItem(STORAGE_KEYS.USER_ID);
    } catch (error) {
      console.warn('Failed to clear migration data:', error);
    }
  }
}