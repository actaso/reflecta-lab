'use client';

import { Card, CardHeader, CardTitle, CardDescription, CardAction } from '@/components/ui/card';

export function AIErrorFallback() {
  return (
    <Card className="w-full mb-6 border border-neutral-200 dark:border-neutral-700 bg-white dark:bg-neutral-800 py-4">
      <CardHeader className="grid grid-cols-[1fr_auto] items-center gap-1.5 px-6">
        <CardTitle className="text-foreground text-base">AI features unavailable</CardTitle>
        <CardAction className="place-self-center justify-self-end">
          <button
            onClick={() => window.location.reload()}
            className="px-4 py-2 bg-neutral-100 dark:bg-neutral-700 text-neutral-700 dark:text-neutral-200 rounded-lg text-sm font-medium hover:bg-neutral-200 dark:hover:bg-neutral-600 transition-colors duration-200"
          >
            Refresh Page
          </button>
        </CardAction>
        <CardDescription className="text-muted-foreground col-span-full">Please refresh to try again.</CardDescription>
      </CardHeader>
    </Card>
  );
}
