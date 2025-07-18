'use client';

import { usePostHog } from 'posthog-js/react';
import { useUser } from '@clerk/nextjs';
import { useRef, useCallback, useEffect } from 'react';

export function useAnalytics() {
  const posthog = usePostHog();
  const { user } = useUser();
  const debounceRef = useRef<NodeJS.Timeout | null>(null);
  const identifiedUserRef = useRef<string | null>(null);

  // Handle user identification with proper timing
  useEffect(() => {
    if (user && posthog && identifiedUserRef.current !== user.id) {
      try {
        posthog.identify(user.id, {
          email: user.emailAddresses[0]?.emailAddress,
          name: user.fullName,
        });
        identifiedUserRef.current = user.id;
        
        if (process.env.NODE_ENV === 'development') {
          console.log('📊 [ANALYTICS] User identified:', user.id);
        }
      } catch (error) {
        if (process.env.NODE_ENV === 'development') {
          console.warn('Failed to identify user in PostHog:', error);
        }
      }
    }
    
    // Reset identification when user logs out
    if (!user) {
      identifiedUserRef.current = null;
    }
  }, [user, posthog]);

  const trackPageView = useCallback(() => {
    if (!posthog) return;
    
    try {
      posthog.capture('page_view', {
        path: window.location.pathname,
        referrer: document.referrer,
      });
    } catch (error) {
      if (process.env.NODE_ENV === 'development') {
        console.warn('Failed to track page view:', error);
      }
    }
  }, [posthog]);

  const trackEntryCreated = useCallback(() => {
    if (!posthog) return;
    
    try {
      posthog.capture('entry_created', {
        timestamp: new Date().toISOString(),
      });
    } catch (error) {
      if (process.env.NODE_ENV === 'development') {
        console.warn('Failed to track entry created:', error);
      }
    }
  }, [posthog]);

  const trackEntryUpdated = useCallback((entryId: string, contentLength: number) => {
    if (!posthog) return;
    
    // Debounce content updates to avoid excessive events
    if (debounceRef.current) {
      clearTimeout(debounceRef.current);
    }

    debounceRef.current = setTimeout(() => {
      try {
        posthog.capture('entry_updated', {
          entry_id: entryId,
          content_length: contentLength,
          timestamp: new Date().toISOString(),
        });
      } catch (error) {
        if (process.env.NODE_ENV === 'development') {
          console.warn('Failed to track entry updated:', error);
        }
      }
    }, 500); // 500ms debounce
  }, [posthog]);

  const trackSignIn = useCallback((properties?: {
    method?: string;
    hasExistingData?: boolean;
    anonymousEntryCount?: number;
  }) => {
    if (!posthog) return;
    
    try {
      posthog.capture('user_signed_in', {
        timestamp: new Date().toISOString(),
        method: properties?.method || 'clerk',
        has_existing_data: properties?.hasExistingData || false,
        anonymous_entry_count: properties?.anonymousEntryCount || 0,
      });
    } catch (error) {
      if (process.env.NODE_ENV === 'development') {
        console.warn('Failed to track sign in:', error);
      }
    }
  }, [posthog]);

  const trackSignUp = useCallback((properties?: {
    method?: string;
    hasExistingData?: boolean;
    anonymousEntryCount?: number;
  }) => {
    if (!posthog) return;
    
    try {
      posthog.capture('user_signed_up', {
        timestamp: new Date().toISOString(),
        method: properties?.method || 'clerk',
        has_existing_data: properties?.hasExistingData || false,
        anonymous_entry_count: properties?.anonymousEntryCount || 0,
      });
    } catch (error) {
      if (process.env.NODE_ENV === 'development') {
        console.warn('Failed to track sign up:', error);
      }
    }
  }, [posthog]);

  const trackSignOut = useCallback(() => {
    if (!posthog) return;
    
    try {
      posthog.capture('user_signed_out', {
        timestamp: new Date().toISOString(),
      });
    } catch (error) {
      if (process.env.NODE_ENV === 'development') {
        console.warn('Failed to track sign out:', error);
      }
    }
  }, [posthog]);

  const trackMorningGuidanceGenerated = useCallback((properties?: {
    fromCache?: boolean;
    entryCount?: number;
    hasAlignment?: boolean;
  }) => {
    if (!posthog) return;
    
    try {
      posthog.capture('morning_guidance_generated', {
        timestamp: new Date().toISOString(),
        from_cache: properties?.fromCache || false,
        entry_count: properties?.entryCount || 0,
        has_alignment: properties?.hasAlignment || false,
      });
    } catch (error) {
      if (process.env.NODE_ENV === 'development') {
        console.warn('Failed to track morning guidance generated:', error);
      }
    }
  }, [posthog]);

  const trackMorningGuidanceUsed = useCallback((properties?: {
    useDetailedPrompt?: boolean;
    entryCount?: number;
    hasAlignment?: boolean;
  }) => {
    if (!posthog) return;
    
    try {
      posthog.capture('morning_guidance_used', {
        timestamp: new Date().toISOString(),
        use_detailed_prompt: properties?.useDetailedPrompt || false,
        entry_count: properties?.entryCount || 0,
        has_alignment: properties?.hasAlignment || false,
      });
    } catch (error) {
      if (process.env.NODE_ENV === 'development') {
        console.warn('Failed to track morning guidance used:', error);
      }
    }
  }, [posthog]);

  const trackMorningGuidanceModalOpened = useCallback(() => {
    if (!posthog) return;
    
    try {
      posthog.capture('morning_guidance_modal_opened', {
        timestamp: new Date().toISOString(),
      });
    } catch (error) {
      if (process.env.NODE_ENV === 'development') {
        console.warn('Failed to track morning guidance modal opened:', error);
      }
    }
  }, [posthog]);

  const trackMorningGuidanceDismissed = useCallback((properties?: {
    entryCount?: number;
    hasAlignment?: boolean;
  }) => {
    if (!posthog) return;
    
    try {
      posthog.capture('morning_guidance_dismissed', {
        timestamp: new Date().toISOString(),
        entry_count: properties?.entryCount || 0,
        has_alignment: properties?.hasAlignment || false,
      });
    } catch (error) {
      if (process.env.NODE_ENV === 'development') {
        console.warn('Failed to track morning guidance dismissed:', error);
      }
    }
  }, [posthog]);

  const trackAlignmentSet = useCallback((properties?: {
    alignmentLength?: number;
    isUpdate?: boolean;
  }) => {
    if (!posthog) return;
    
    try {
      posthog.capture('alignment_set', {
        timestamp: new Date().toISOString(),
        alignment_length: properties?.alignmentLength || 0,
        is_update: properties?.isUpdate || false,
      });
    } catch (error) {
      if (process.env.NODE_ENV === 'development') {
        console.warn('Failed to track alignment set:', error);
      }
    }
  }, [posthog]);

  const trackCoachingCompletion = useCallback((properties?: {
    modelId?: string;
    variant?: string;
    entryId?: string;
    contentLength?: number;
    hasOptions?: boolean;
    optionCount?: number;
  }) => {
    if (!posthog) return;
    
    try {
      posthog.capture('coaching_completion', {
        timestamp: new Date().toISOString(),
        model_id: properties?.modelId || 'unknown',
        variant: properties?.variant || 'text',
        entry_id: properties?.entryId,
        content_length: properties?.contentLength || 0,
        has_options: properties?.hasOptions || false,
        option_count: properties?.optionCount || 0,
      });
    } catch (error) {
      if (process.env.NODE_ENV === 'development') {
        console.warn('Failed to track coaching completion:', error);
      }
    }
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
    trackMorningGuidanceDismissed,
    trackAlignmentSet,
    trackCoachingCompletion,
  };
}