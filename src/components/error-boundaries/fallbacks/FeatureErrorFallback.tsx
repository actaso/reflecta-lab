'use client';

import { Button } from '@/components/ui/button';
import type { ErrorFallbackProps } from '@/types/errorBoundary';

export function FeatureErrorFallback({ context, onRetry }: ErrorFallbackProps) {
  const isSidebar = context === 'Sidebar';
  
  return (
    <div className={`p-4 bg-white dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 rounded-lg ${isSidebar ? 'mt-6' : ''}`}>
      <div className="space-y-2">
        <h3 className="font-medium text-foreground text-sm">
          {context || 'Feature'} temporarily unavailable
        </h3>
        <p className="text-muted-foreground text-xs leading-relaxed">
          Other parts of the application continue to work normally. Your data remains safe.
        </p>
        {onRetry && (
          <div>
            <Button onClick={onRetry} size="sm" variant="outline">
              {context === 'Sidebar' ? 'Reload Sidebar' : 'Try Again'}
            </Button>
          </div>
        )}
      </div>
    </div>
  );
}
