'use client';

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useUser } from '@clerk/nextjs';
import { JournalEntry } from '@/types/journal';
import { EntriesApi } from '@/lib/entriesApi';
import { useToast } from './useToast';
import { getAllEntriesChronological } from '@/utils/formatters';

/**
 * Query keys for TanStack Query
 */
export const entriesKeys = {
  all: ['entries'] as const,
  lists: () => [...entriesKeys.all, 'list'] as const,
  list: (userId?: string) => [...entriesKeys.lists(), userId] as const,
};

/**
 * Hook for fetching journal entries
 * Primary source: localStorage (instant)
 * Background: Firestore sync when authenticated
 */
export function useEntries() {
  const { user } = useUser();
  
  return useQuery({
    queryKey: entriesKeys.list(user?.id),
    queryFn: () => EntriesApi.getEntries(),
    staleTime: Infinity, // localStorage is always fresh
    gcTime: Infinity, // Keep in cache forever
  });
}

/**
 * Hook for creating new entries with optimistic updates
 */
export function useCreateEntry() {
  const { user } = useUser();
  const queryClient = useQueryClient();
  const { showSyncError } = useToast();

  return useMutation({
    mutationFn: (content: string) => EntriesApi.createEntry(content, user?.id),
    
    onMutate: async (content: string) => {
      // Cancel outgoing refetches
      await queryClient.cancelQueries({ queryKey: entriesKeys.list(user?.id) });

      // Snapshot previous value
      const previousEntries = queryClient.getQueryData<Record<string, JournalEntry[]>>(
        entriesKeys.list(user?.id)
      );

      // Optimistically update - create temporary entry for instant UI
      if (previousEntries) {
        const now = new Date();
        const tempId = `temp-${Date.now()}`;
        const dateKey = now.toISOString().split('T')[0];
        
        const optimisticEntry: JournalEntry = {
          id: tempId,
          uid: tempId,
          timestamp: now,
          content,
          userId: user?.id,
          synced: false,
          createdAt: now,
          pendingSync: false, // Will be handled by background sync
        };

        const optimisticEntries = {
          ...previousEntries,
          [dateKey]: [optimisticEntry, ...(previousEntries[dateKey] || [])],
        };

        queryClient.setQueryData(entriesKeys.list(user?.id), optimisticEntries);
      }

      return { previousEntries };
    },
    
    onSuccess: (data, variables, context) => {
      // Replace optimistic update with real data
      queryClient.setQueryData(entriesKeys.list(user?.id), data.allEntries);
    },
    
    onError: (error, variables, context) => {
      // Rollback optimistic update
      if (context?.previousEntries) {
        queryClient.setQueryData(entriesKeys.list(user?.id), context.previousEntries);
      }
      showSyncError(error.message);
    },
  });
}

/**
 * Hook for updating entries with optimistic updates
 */
export function useUpdateEntry() {
  const { user } = useUser();
  const queryClient = useQueryClient();
  const { showSyncError } = useToast();

  return useMutation({
    mutationFn: ({ entryId, content }: { entryId: string; content: string }) =>
      EntriesApi.updateEntry(entryId, content, user?.id),
    
    onMutate: async ({ entryId, content }) => {
      await queryClient.cancelQueries({ queryKey: entriesKeys.list(user?.id) });

      const previousEntries = queryClient.getQueryData<Record<string, JournalEntry[]>>(
        entriesKeys.list(user?.id)
      );

      // Optimistically update entry content
      if (previousEntries) {
        const optimisticEntries = { ...previousEntries };
        
        for (const dateKey in optimisticEntries) {
          const entryIndex = optimisticEntries[dateKey].findIndex(e => e.id === entryId);
          if (entryIndex !== -1) {
            optimisticEntries[dateKey] = [...optimisticEntries[dateKey]];
            optimisticEntries[dateKey][entryIndex] = {
              ...optimisticEntries[dateKey][entryIndex],
              content,
              updatedAt: new Date(),
            };
            break;
          }
        }

        queryClient.setQueryData(entriesKeys.list(user?.id), optimisticEntries);
      }

      return { previousEntries };
    },
    
    onSuccess: (data) => {
      queryClient.setQueryData(entriesKeys.list(user?.id), data);
    },
    
    onError: (error, variables, context) => {
      if (context?.previousEntries) {
        queryClient.setQueryData(entriesKeys.list(user?.id), context.previousEntries);
      }
      showSyncError(error.message);
    },
  });
}

/**
 * Hook for deleting entries with optimistic updates
 */
export function useDeleteEntry() {
  const { user } = useUser();
  const queryClient = useQueryClient();
  const { showSyncError } = useToast();

  return useMutation({
    mutationFn: (entryId: string) => EntriesApi.deleteEntry(entryId, user?.id),
    
    onMutate: async (entryId: string) => {
      await queryClient.cancelQueries({ queryKey: entriesKeys.list(user?.id) });

      const previousEntries = queryClient.getQueryData<Record<string, JournalEntry[]>>(
        entriesKeys.list(user?.id)
      );

      // Optimistically remove entry
      if (previousEntries) {
        const optimisticEntries = { ...previousEntries };
        
        for (const dateKey in optimisticEntries) {
          optimisticEntries[dateKey] = optimisticEntries[dateKey].filter(e => e.id !== entryId);
          if (optimisticEntries[dateKey].length === 0) {
            delete optimisticEntries[dateKey];
          }
        }

        queryClient.setQueryData(entriesKeys.list(user?.id), optimisticEntries);
      }

      return { previousEntries };
    },
    
    onSuccess: (data) => {
      queryClient.setQueryData(entriesKeys.list(user?.id), data);
    },
    
    onError: (error, variables, context) => {
      if (context?.previousEntries) {
        queryClient.setQueryData(entriesKeys.list(user?.id), context.previousEntries);
      }
      showSyncError(error.message);
    },
  });
}

/**
 * Hook for syncing entries when user authenticates
 */
export function useSyncEntries() {
  const { user } = useUser();
  const queryClient = useQueryClient();
  const { showSyncSuccess, showSyncError } = useToast();

  return useMutation({
    mutationFn: (localEntries: Record<string, JournalEntry[]>) => {
      if (!user) throw new Error('User not authenticated');
      return EntriesApi.syncEntries(localEntries, user.id);
    },
    
    onSuccess: (data) => {
      // Update cache with synced entries
      queryClient.setQueryData(entriesKeys.list(user?.id), data.entries);
      
      // Show success toast
      showSyncSuccess(data.stats.uploaded, data.stats.downloaded, data.stats.conflicts);
    },
    
    onError: (error) => {
      showSyncError(error.message);
    },
  });
}

/**
 * Utility hook to get chronological entries
 */
export function useEntriesChronological() {
  const { data: entries } = useEntries();
  
  if (!entries) return [];
  
  return getAllEntriesChronological(entries);
}