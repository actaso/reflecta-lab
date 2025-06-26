'use client';

import { JournalEntry } from '@/types/journal';
import { LocalStorageService } from './localStorage';
import { SyncService } from './syncService';
import { isFirebaseConfigured } from './firebase';

/**
 * Entries API layer for TanStack Query
 * Handles localStorage as primary source with optional Firestore sync
 */
export class EntriesApi {
  /**
   * Get all entries from localStorage
   * This is the primary source for instant reads
   */
  static async getEntries(): Promise<Record<string, JournalEntry[]>> {
    // Simulate async for consistency with TanStack Query patterns
    return new Promise((resolve) => {
      const entries = LocalStorageService.loadEntries();
      resolve(entries);
    });
  }

  /**
   * Create a new entry
   * Instantly saves to localStorage, optionally syncs to Firestore
   */
  static async createEntry(
    content: string,
    userId?: string
  ): Promise<{ entry: JournalEntry; allEntries: Record<string, JournalEntry[]> }> {
    // Get current entries from localStorage
    const currentEntries = LocalStorageService.loadEntries();
    
    // Add new entry
    const { entries: updatedEntries, entry: newEntry } = LocalStorageService.addEntry(
      currentEntries,
      content,
      userId
    );

    // Mark entries as pending sync - actual sync will be handled by useSync hook
    // when Firebase authentication is ready

    return {
      entry: newEntry,
      allEntries: updatedEntries,
    };
  }

  /**
   * Update an existing entry
   * Instantly saves to localStorage, optionally syncs to Firestore
   */
  static async updateEntry(
    entryId: string,
    content: string,
    _userId?: string
  ): Promise<Record<string, JournalEntry[]>> {
    // Get current entries from localStorage
    const currentEntries = LocalStorageService.loadEntries();
    
    // Update entry
    const updatedEntries = LocalStorageService.updateEntry(currentEntries, entryId, content);

    // Mark entries as pending sync - actual sync will be handled by useSync hook
    // when Firebase authentication is ready

    return updatedEntries;
  }

  /**
   * Delete an entry
   * Instantly removes from localStorage, optionally syncs to Firestore
   */
  static async deleteEntry(
    entryId: string,
    _userId?: string
  ): Promise<Record<string, JournalEntry[]>> {
    // Get current entries from localStorage
    const currentEntries = LocalStorageService.loadEntries();
    
    // Delete entry
    const updatedEntries = LocalStorageService.deleteEntry(currentEntries, entryId);

    // Mark entries as pending sync - actual sync will be handled by useSync hook
    // when Firebase authentication is ready

    return updatedEntries;
  }

  /**
   * Sync entries with Firestore
   * Used for initial sync when user authenticates
   */
  static async syncEntries(
    localEntries: Record<string, JournalEntry[]>,
    userId: string
  ): Promise<{
    entries: Record<string, JournalEntry[]>;
    stats: {
      uploaded: number;
      downloaded: number;
      conflicts: number;
    };
  }> {
    if (!isFirebaseConfigured()) {
      throw new Error('Firebase not configured');
    }

    const { entries: syncedEntries, result } = await SyncService.syncOnAuthentication(
      userId,
      localEntries
    );

    return {
      entries: syncedEntries,
      stats: {
        uploaded: result.entriesUploaded,
        downloaded: result.entriesDownloaded,
        conflicts: result.conflicts,
      },
    };
  }


  /**
   * Get sync statistics
   */
  static getSyncStats(entries: Record<string, JournalEntry[]>) {
    return SyncService.getSyncStats(entries);
  }
}