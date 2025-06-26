/**
 * Enhanced JournalEntry type with sync capabilities
 */
export type JournalEntry = {
  id: string;           // Document ID: "userId-uuid" for auth users, "uuid" for anonymous
  timestamp: Date;
  content: string;
  userId?: string;      // Present for authenticated users (Clerk user ID)
  
  // Sync metadata
  synced?: boolean;     // Whether entry exists in Firestore
  createdAt: Date;      // When entry was first created
  updatedAt?: Date;     // Last local modification
  syncedAt?: Date;      // Last successful sync to Firestore
  
  // Local-only flags
  pendingSync?: boolean;  // Entry has unsaved changes waiting to sync
  syncError?: string;     // Last sync error message
};

/**
 * Firestore document structure (server-side)
 */
export type FirestoreJournalEntry = {
  userId: string;           // Clerk user ID
  timestamp: Date;          // Firestore will convert to Timestamp
  content: string;
  createdAt: Date;          // Firestore will convert to Timestamp
  updatedAt: Date;          // Firestore will convert to Timestamp
  syncedAt: Date;           // Firestore will convert to Timestamp
};

/**
 * Sync operation result
 */
export type SyncResult = {
  success: boolean;
  entriesUploaded: number;
  entriesDownloaded: number;
  conflicts: number;
  errors: SyncError[];
};

/**
 * Sync error details
 */
export type SyncError = {
  entryId: string;
  operation: 'upload' | 'download' | 'delete';
  error: string;
  retryCount: number;
};

/**
 * Sync status for UI
 */
export type SyncStatus = {
  isOnline: boolean;
  isSyncing: boolean;
  lastSyncTime?: Date;
  pendingCount: number;
  hasErrors: boolean;
  errors: SyncError[];
};

/**
 * Storage key constants
 */
export const STORAGE_KEYS = {
  ENTRIES: 'journal-entries', // Keep original key for backward compatibility
  SYNC_STATUS: 'reflecta-sync-status',
  USER_ID: 'reflecta-user-id',
} as const;