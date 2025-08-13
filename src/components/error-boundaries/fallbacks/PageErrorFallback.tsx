'use client';

import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import type { ErrorFallbackProps } from '@/types/errorBoundary';

type PageErrorFallbackProps = Required<Pick<ErrorFallbackProps, 'onRetry' | 'onReload'>>;

export function PageErrorFallback({ onRetry, onReload }: PageErrorFallbackProps) {
  return (
    <div className="h-screen bg-background flex items-center justify-center px-6">
      <Card className="w-full max-w-md border border-neutral-200 dark:border-neutral-700 bg-white dark:bg-neutral-800 shadow-lg">
        <CardHeader>
          <CardTitle className="text-foreground text-lg">Page Error</CardTitle>
          <CardDescription className="text-muted-foreground">
            This page encountered an error. Your entries remain safe.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col sm:flex-row gap-3">
            <Button onClick={onRetry} className="sm:flex-1">Try Again</Button>
            <Button onClick={onReload} variant="outline" className="sm:flex-1">Refresh Page</Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
