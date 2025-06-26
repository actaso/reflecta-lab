'use client';

import { useEffect, useState, useCallback } from 'react';
import { useUser } from '@clerk/nextjs';
import { useFirebaseAuth } from '@/lib/firebase-auth';
import { SyncService } from '@/lib/syncService';
import { LocalStorageService } from '@/lib/localStorage';
import { JournalEntry, SyncStatus, SyncResult } from '@/types/journal';

/**
 * Hook for managing sync state and operations
 */
export function useSync() {
  const [syncStatus, setSyncStatus] = useState<SyncStatus>(() => 
    LocalStorageService.loadSyncStatus()
  );
  const [lastSyncResult, setLastSyncResult] = useState<SyncResult | null>(null);
  
  const { user: clerkUser } = useUser();
  const { firebaseUser, isAuthenticated } = useFirebaseAuth();

  /**
   * Update sync status and persist to localStorage
   */
  const updateSyncStatus = useCallback((updates: Partial<SyncStatus>) => {
    setSyncStatus(prev => {
      const newStatus = { ...prev, ...updates };
      LocalStorageService.saveSyncStatus(newStatus);
      return newStatus;
    });
  }, []);

  /**
   * Check online connectivity
   */
  const checkConnectivity = useCallback(async () => {
    const isOnline = await SyncService.checkConnectivity();
    updateSyncStatus({ isOnline });
    return isOnline;
  }, [updateSyncStatus]);

  /**
   * Perform sync operation
   */
  const performSync = useCallback(async (
    localEntries: Record<string, JournalEntry[]>
  ): Promise<{ entries: Record<string, JournalEntry[]>; result: SyncResult }> => {
    if (!clerkUser || !isAuthenticated) {
      console.log('👤 User not authenticated, skipping sync');
      return { entries: localEntries, result: {
        success: false,
        entriesUploaded: 0,
        entriesDownloaded: 0,
        conflicts: 0,
        errors: [{ entryId: '', operation: 'upload', error: 'User not authenticated', retryCount: 0 }]
      }};
    }

    console.log('🚀 Starting sync operation...');
    updateSyncStatus({ isSyncing: true });

    try {
      const result = await SyncService.syncOnAuthentication(clerkUser.id, localEntries);
      
      // Update sync status
      const stats = SyncService.getSyncStats(result.entries);
      updateSyncStatus({
        isSyncing: false,
        lastSyncTime: new Date(),
        pendingCount: stats.pending,
        hasErrors: result.result.errors.length > 0,
        errors: result.result.errors,
      });

      setLastSyncResult(result.result);
      
      // Log sync summary
      console.log('📊 Sync Summary:', {
        uploaded: result.result.entriesUploaded,
        downloaded: result.result.entriesDownloaded,
        conflicts: result.result.conflicts,
        errors: result.result.errors.length,
        stats,
      });

      return result;
    } catch (error) {
      console.error('❌ Sync operation failed:', error);
      updateSyncStatus({
        isSyncing: false,
        hasErrors: true,
        errors: [{ 
          entryId: '', 
          operation: 'upload', 
          error: error instanceof Error ? error.message : 'Unknown sync error', 
          retryCount: 0 
        }],
      });

      return { entries: localEntries, result: {
        success: false,
        entriesUploaded: 0,
        entriesDownloaded: 0,
        conflicts: 0,
        errors: [{ 
          entryId: '', 
          operation: 'upload', 
          error: error instanceof Error ? error.message : 'Unknown sync error', 
          retryCount: 0 
        }]
      }};
    }
  }, [clerkUser, isAuthenticated, updateSyncStatus]);

  /**
   * Retry failed sync operations
   */
  const retrySync = useCallback(async (
    localEntries: Record<string, JournalEntry[]>
  ): Promise<Record<string, JournalEntry[]>> => {
    if (!clerkUser || !isAuthenticated) {
      return localEntries;
    }

    console.log('🔄 Retrying failed sync operations...');
    updateSyncStatus({ isSyncing: true });

    try {
      const updatedEntries = await SyncService.retryFailedSyncs(localEntries, clerkUser.id);
      
      const stats = SyncService.getSyncStats(updatedEntries);
      updateSyncStatus({
        isSyncing: false,
        pendingCount: stats.pending,
        hasErrors: stats.errors > 0,
        lastSyncTime: new Date(),
      });

      return updatedEntries;
    } catch (error) {
      console.error('❌ Retry sync failed:', error);
      updateSyncStatus({ isSyncing: false });
      return localEntries;
    }
  }, [clerkUser, isAuthenticated, updateSyncStatus]);

  /**
   * Update pending count based on current entries
   */
  const updatePendingCount = useCallback((entries: Record<string, JournalEntry[]>) => {
    const stats = SyncService.getSyncStats(entries);
    updateSyncStatus({ 
      pendingCount: stats.pending,
      hasErrors: stats.errors > 0,
    });
  }, [updateSyncStatus]);

  /**
   * Monitor online status
   */
  useEffect(() => {
    const handleOnline = () => {
      console.log('🌐 Back online');
      updateSyncStatus({ isOnline: true });
    };

    const handleOffline = () => {
      console.log('📵 Gone offline');
      updateSyncStatus({ isOnline: false });
    };

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    // Initial check
    updateSyncStatus({ isOnline: navigator.onLine });

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, [updateSyncStatus]);

  /**
   * Periodic connectivity check
   */
  useEffect(() => {
    if (!syncStatus.isOnline) return;

    const interval = setInterval(async () => {
      const isConnected = await checkConnectivity();
      if (!isConnected && syncStatus.isOnline) {
        console.log('🔌 Lost Firebase connectivity');
        updateSyncStatus({ isOnline: false });
      }
    }, 30000); // Check every 30 seconds

    return () => clearInterval(interval);
  }, [syncStatus.isOnline, checkConnectivity, updateSyncStatus]);

  return {
    syncStatus,
    lastSyncResult,
    performSync,
    retrySync,
    updatePendingCount,
    checkConnectivity,
  };
}