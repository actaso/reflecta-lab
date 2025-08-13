'use client';

import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';

export function CoachingErrorFallback() {
  return (
    <div className="h-screen bg-background flex items-center justify-center px-6">
      <Card className="w-full max-w-md border border-neutral-200 dark:border-neutral-700 bg-white dark:bg-neutral-800 shadow-lg">
        <CardHeader>
          <CardTitle className="text-foreground text-lg">Coaching session error</CardTitle>
          <CardDescription className="text-muted-foreground">You can go back to your journal or try again.</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col sm:flex-row gap-3">
            <Button onClick={() => (window.location.href = '/')} variant="outline" className="sm:flex-1">Back to Journal</Button>
            <Button onClick={() => window.location.reload()} className="sm:flex-1">Try Again</Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
