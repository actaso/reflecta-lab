'use client';

import type { ErrorFallbackProps } from '@/types/errorBoundary';

export function ComponentErrorFallback({ context, onRetry }: ErrorFallbackProps) {
  return (
    <div className="p-3 bg-white dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 rounded-md">
      <div className="flex items-center justify-between gap-3">
        <span className="text-muted-foreground text-xs">
          {context ? `${context} component` : 'Component'} error
        </span>
        {onRetry && (
          <button
            onClick={onRetry}
            className="text-xs text-primary hover:underline"
          >
            retry
          </button>
        )}
      </div>
    </div>
  );
}
