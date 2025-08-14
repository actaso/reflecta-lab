'use client';

import { Card, CardHeader, CardTitle, CardDescription, CardAction } from '@/components/ui/card';

export function EditorErrorFallback() {
  return (
    <Card className="w-full mt-4 mb-4 py-4 border border-neutral-200 dark:border-neutral-700 bg-white dark:bg-neutral-800">
      <CardHeader>
        <CardTitle className="text-foreground text-base">Editor unavailable</CardTitle>
        <CardDescription className="text-muted-foreground">Please refresh to continue writing.</CardDescription>
        <CardAction className="place-self-center justify-self-end">
          <button
            onClick={() => window.location.reload()}
            className="px-4 py-2 bg-neutral-100 dark:bg-neutral-700 text-neutral-700 dark:text-neutral-200 rounded-lg text-sm font-medium hover:bg-neutral-200 dark:hover:bg-neutral-600 transition-colors duration-200"
          >
            Refresh Page
          </button>
        </CardAction>
      </CardHeader>
    </Card>
  );
}
