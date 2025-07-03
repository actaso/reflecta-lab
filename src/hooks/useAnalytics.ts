'use client';

import { usePostHog } from 'posthog-js/react';
import { useUser } from '@clerk/nextjs';
import { useRef, useCallback } from 'react';

export function useAnalytics() {
  const posthog = usePostHog();
  const { user } = useUser();
  const debounceRef = useRef<NodeJS.Timeout>();

  // Identify user if authenticated
  if (user && posthog) {
    posthog.identify(user.id, {
      email: user.emailAddresses[0]?.emailAddress,
      name: user.fullName,
    });
  }

  const trackPageView = useCallback(() => {
    posthog?.capture('page_view', {
      path: window.location.pathname,
      referrer: document.referrer,
    });
  }, [posthog]);

  const trackEntryCreated = useCallback(() => {
    posthog?.capture('entry_created', {
      timestamp: new Date().toISOString(),
    });
  }, [posthog]);

  const trackEntryUpdated = useCallback((entryId: string, contentLength: number) => {
    // Debounce content updates to avoid excessive events
    if (debounceRef.current) {
      clearTimeout(debounceRef.current);
    }

    debounceRef.current = setTimeout(() => {
      posthog?.capture('entry_updated', {
        entry_id: entryId,
        content_length: contentLength,
        timestamp: new Date().toISOString(),
      });
    }, 500); // 500ms debounce
  }, [posthog]);

  return {
    trackPageView,
    trackEntryCreated,
    trackEntryUpdated,
  };
}