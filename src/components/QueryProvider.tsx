'use client';

import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { useState } from 'react';

/**
 * Client-side QueryClient provider
 * Ensures QueryClient is created on the client side only
 */
export function QueryProvider({ children }: { children: React.ReactNode }) {
  // Create QueryClient in client component to avoid SSR issues
  const [queryClient] = useState(
    () =>
      new QueryClient({
        defaultOptions: {
          queries: {
            // Cache data for 5 minutes by default
            staleTime: 5 * 60 * 1000,
            // Keep cache for 10 minutes
            gcTime: 10 * 60 * 1000,
            // Retry failed requests 3 times
            retry: 3,
            // Don't refetch on window focus in development to avoid noise
            refetchOnWindowFocus: process.env.NODE_ENV === 'production',
            // Refetch on reconnection for sync
            refetchOnReconnect: true,
          },
          mutations: {
            // Retry mutations once on failure
            retry: 1,
          },
        },
      })
  );

  return (
    <QueryClientProvider client={queryClient}>
      {children}
    </QueryClientProvider>
  );
}