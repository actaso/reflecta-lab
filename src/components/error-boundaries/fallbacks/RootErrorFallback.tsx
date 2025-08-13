'use client';

import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import type { ErrorFallbackProps } from '@/types/errorBoundary';

interface RootErrorFallbackProps extends Pick<ErrorFallbackProps, 'onReload'> {
  onReload: () => void;
}

export function RootErrorFallback({ onReload }: RootErrorFallbackProps) {
  return (
    <div className="h-screen bg-background flex items-center justify-center px-6">
      <Card className="w-full max-w-md border border-neutral-200 dark:border-neutral-700 bg-white dark:bg-neutral-800 shadow-lg">
        <CardHeader>
          <CardTitle className="text-foreground text-lg">Something went wrong</CardTitle>
          <CardDescription className="text-muted-foreground">
            The application encountered an unexpected error. Your data is safe.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-between gap-3">
            <Button onClick={onReload} className="flex-1">Refresh Application</Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
