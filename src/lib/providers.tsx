'use client';

import posthog from 'posthog-js';
import { PostHogProvider } from 'posthog-js/react';
import { useEffect } from 'react';

export function PHProvider({ children }: { children: React.ReactNode }) {
  useEffect(() => {
    posthog.init(process.env.NEXT_PUBLIC_POSTHOG_KEY!, {
      api_host: process.env.NEXT_PUBLIC_POSTHOG_HOST || 'https://app.posthog.com',
      capture_pageview: false, // We'll manually capture pageviews
      capture_pageleave: true,
      loaded: () => {
        if (process.env.NODE_ENV === 'development') console.log('PostHog loaded');
      }
    });
  }, []);

  return <PostHogProvider client={posthog}>{children}</PostHogProvider>;
}