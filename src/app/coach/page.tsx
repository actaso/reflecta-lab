import { Suspense } from 'react';
import CoachingSession from '@/components/CoachingSession';
import { CoachingErrorBoundary } from '@/components/error-boundaries';

function CoachingSessionFallback() {
  return (
    <div className="h-screen bg-white flex items-center justify-center">
      <div className="text-center">
        <div className="w-8 h-8 border-2 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
        <p className="text-neutral-600">Loading your coaching session...</p>
      </div>
    </div>
  );
}

export default function CoachPage() {
  return (
    <CoachingErrorBoundary>
      <Suspense fallback={<CoachingSessionFallback />}>
        <CoachingSession />
      </Suspense>
    </CoachingErrorBoundary>
  );
} 