'use client';

import { usePostHog } from 'posthog-js/react';
import { useUser } from '@clerk/nextjs';
import { useRef, useCallback } from 'react';

export function useAnalytics() {
  const posthog = usePostHog();
  const { user } = useUser();
  const debounceRef = useRef<NodeJS.Timeout | null>(null);

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

  const trackSignIn = useCallback((properties?: {
    method?: string;
    hasExistingData?: boolean;
    anonymousEntryCount?: number;
  }) => {
    posthog?.capture('user_signed_in', {
      timestamp: new Date().toISOString(),
      method: properties?.method || 'clerk',
      has_existing_data: properties?.hasExistingData || false,
      anonymous_entry_count: properties?.anonymousEntryCount || 0,
    });
  }, [posthog]);

  const trackSignUp = useCallback((properties?: {
    method?: string;
    hasExistingData?: boolean;
    anonymousEntryCount?: number;
  }) => {
    posthog?.capture('user_signed_up', {
      timestamp: new Date().toISOString(),
      method: properties?.method || 'clerk',
      has_existing_data: properties?.hasExistingData || false,
      anonymous_entry_count: properties?.anonymousEntryCount || 0,
    });
  }, [posthog]);

  const trackSignOut = useCallback(() => {
    posthog?.capture('user_signed_out', {
      timestamp: new Date().toISOString(),
    });
  }, [posthog]);

  const trackMorningGuidanceGenerated = useCallback((properties?: {
    fromCache?: boolean;
    entryCount?: number;
    hasAlignment?: boolean;
  }) => {
    posthog?.capture('morning_guidance_generated', {
      timestamp: new Date().toISOString(),
      from_cache: properties?.fromCache || false,
      entry_count: properties?.entryCount || 0,
      has_alignment: properties?.hasAlignment || false,
    });
  }, [posthog]);

  const trackMorningGuidanceUsed = useCallback((properties?: {
    useDetailedPrompt?: boolean;
    entryCount?: number;
    hasAlignment?: boolean;
  }) => {
    posthog?.capture('morning_guidance_used', {
      timestamp: new Date().toISOString(),
      use_detailed_prompt: properties?.useDetailedPrompt || false,
      entry_count: properties?.entryCount || 0,
      has_alignment: properties?.hasAlignment || false,
    });
  }, [posthog]);

  const trackMorningGuidanceModalOpened = useCallback(() => {
    posthog?.capture('morning_guidance_modal_opened', {
      timestamp: new Date().toISOString(),
    });
  }, [posthog]);

  const trackAlignmentSet = useCallback((properties?: {
    alignmentLength?: number;
    isUpdate?: boolean;
  }) => {
    posthog?.capture('alignment_set', {
      timestamp: new Date().toISOString(),
      alignment_length: properties?.alignmentLength || 0,
      is_update: properties?.isUpdate || false,
    });
  }, [posthog]);

  return {
    trackPageView,
    trackEntryCreated,
    trackEntryUpdated,
    trackSignIn,
    trackSignUp,
    trackSignOut,
    trackMorningGuidanceGenerated,
    trackMorningGuidanceUsed,
    trackMorningGuidanceModalOpened,
    trackAlignmentSet,
  };
}