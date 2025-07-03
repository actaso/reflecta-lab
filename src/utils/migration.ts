import { JournalEntry } from '../types/journal';
import { formatDate } from './formatters';

type LegacyJournalEntry = {
  id: string;
  timestamp: Date;
  content: string;
};

/**
 * Migrates legacy journal entries to the new schema with uid and lastUpdated fields
 */
export function migrateLegacyEntries(
  legacyEntries: Record<string, LegacyJournalEntry[]>,
  uid: string = 'local-user'
): Record<string, JournalEntry[]> {
  const migratedEntries: Record<string, JournalEntry[]> = {};
  
  Object.keys(legacyEntries).forEach(dateKey => {
    migratedEntries[dateKey] = legacyEntries[dateKey].map(entry => ({
      ...entry,
      uid,
      lastUpdated: entry.timestamp, // Use creation time as initial lastUpdated
    }));
  });
  
  return migratedEntries;
}

/**
 * Migrates a flat array of legacy entries to the new schema
 */
export function migrateLegacyEntriesFlat(
  legacyEntries: LegacyJournalEntry[],
  uid: string = 'local-user'
): JournalEntry[] {
  return legacyEntries.map(entry => ({
    ...entry,
    uid,
    lastUpdated: entry.timestamp, // Use creation time as initial lastUpdated
  }));
}

/**
 * Checks if an entry needs migration (missing uid or lastUpdated fields)
 */
export function needsMigration(entry: any): boolean {
  return !entry.uid || !entry.lastUpdated;
}

/**
 * Migrates localStorage data if needed
 */
export function migrateLocalStorageIfNeeded(uid: string = 'local-user'): void {
  const savedEntries = localStorage.getItem('journal-entries');
  if (!savedEntries) return;
  
  try {
    const parsed = JSON.parse(savedEntries);
    let needsMigrationFlag = false;
    
    // Check if any entries need migration
    Object.keys(parsed).forEach(dateKey => {
      const entries = parsed[dateKey];
      if (entries && entries.length > 0) {
        if (needsMigration(entries[0])) {
          needsMigrationFlag = true;
        }
      }
    });
    
    if (needsMigrationFlag) {
      console.log('Migrating localStorage entries to new schema...');
      
      // Convert timestamp strings back to Date objects for legacy format
      const entriesWithDates: Record<string, LegacyJournalEntry[]> = {};
      Object.keys(parsed).forEach(dateKey => {
        entriesWithDates[dateKey] = parsed[dateKey].map((entry: any) => ({
          id: entry.id,
          timestamp: new Date(entry.timestamp),
          content: entry.content || '',
        }));
      });
      
      // Migrate to new schema
      const migratedEntries = migrateLegacyEntries(entriesWithDates, uid);
      
      // Save back to localStorage
      localStorage.setItem('journal-entries', JSON.stringify(migratedEntries));
      
      console.log('Migration completed successfully');
    }
  } catch (error) {
    console.error('Failed to migrate localStorage entries:', error);
  }
}