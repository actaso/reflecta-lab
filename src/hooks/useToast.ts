'use client';

import { toast } from 'sonner';

/**
 * Custom hook for consistent toast notifications
 */
export function useToast() {
  
  const showSyncSuccess = (uploaded: number, downloaded: number, conflicts: number) => {
    const messages = [];
    if (uploaded > 0) messages.push(`${uploaded} uploaded`);
    if (downloaded > 0) messages.push(`${downloaded} downloaded`);
    if (conflicts > 0) messages.push(`${conflicts} conflicts resolved`);
    
    toast.success(`Sync complete: ${messages.join(', ')}`, {
      duration: 3000,
    });
  };

  const showSyncError = (error: string) => {
    toast.error(`Sync failed: ${error}`, {
      duration: 5000,
      action: {
        label: 'Retry',
        onClick: () => {
          // Will be handled by the sync retry mechanism
          console.log('Retry requested from toast');
        },
      },
    });
  };

  const showOfflineWarning = () => {
    toast.warning('You\'re offline. Changes will sync when connection is restored.', {
      duration: 4000,
    });
  };

  const showConnectivityRestored = () => {
    toast.success('Connection restored. Syncing changes...', {
      duration: 3000,
    });
  };

  const showAuthenticationRequired = () => {
    toast.info('Sign in to sync your journal across devices', {
      duration: 5000,
    });
  };

  return {
    showSyncSuccess,
    showSyncError,
    showOfflineWarning,
    showConnectivityRestored,
    showAuthenticationRequired,
  };
}