'use client';

import posthog from 'posthog-js';
import { PostHogProvider } from 'posthog-js/react';
import { useEffect } from 'react';

export function PHProvider({ children }: { children: React.ReactNode }) {
  useEffect(() => {
    // Check if PostHog key is available
    const posthogKey = process.env.NEXT_PUBLIC_POSTHOG_KEY;
    
    if (!posthogKey) {
      if (process.env.NODE_ENV === 'development') {
        console.warn('⚠️ PostHog key not found - analytics will be disabled');
      }
      return;
    }

    // Initialize PostHog only once per session
    try {
      posthog.init(posthogKey, {
        api_host: process.env.NEXT_PUBLIC_POSTHOG_HOST || 'https://app.posthog.com',
        capture_pageview: false, // We'll manually capture pageviews
        capture_pageleave: true,
        loaded: () => {
          if (process.env.NODE_ENV === 'development') {
            console.log('✅ PostHog loaded successfully');
          }
        },
        on_request_error: (error) => {
          if (process.env.NODE_ENV === 'development') {
            console.warn('PostHog request error:', error);
          }
        }
      });
    } catch (error) {
      if (process.env.NODE_ENV === 'development') {
        console.error('❌ Failed to initialize PostHog:', error);
      }
    }
  }, []);

  return <PostHogProvider client={posthog}>{children}</PostHogProvider>;
}