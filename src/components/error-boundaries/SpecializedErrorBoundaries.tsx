'use client';
import { ErrorBoundary } from './ErrorBoundary';
import { AIErrorFallback } from './fallbacks/AIErrorFallback';
import { EditorErrorFallback } from './fallbacks/EditorErrorFallback';
import { CoachingErrorFallback } from './fallbacks/CoachingErrorFallback';
import type { SpecializedErrorBoundaryProps } from '@/types/errorBoundary';

// =====================================================================
// SPECIALIZED ERROR BOUNDARIES
// Pre-configured for common use cases with appropriate fallbacks
// =====================================================================

export function AIErrorBoundary({ children }: SpecializedErrorBoundaryProps) {
  return (
    <ErrorBoundary
      level="feature"
      context="AI Features"
      allowRecovery={true}
      fallback={<AIErrorFallback />}
    >
      {children}
    </ErrorBoundary>
  );
}

export function EditorErrorBoundary({ children }: SpecializedErrorBoundaryProps) {
  return (
    <ErrorBoundary
      level="feature"
      context="Editor"
      allowRecovery={true}
      fallback={<EditorErrorFallback />}
    >
      {children}
    </ErrorBoundary>
  );
}

export function SidebarErrorBoundary({ children }: SpecializedErrorBoundaryProps) {
  return (
    <ErrorBoundary
      level="feature"
      context="Sidebar"
      allowRecovery={true}
    >
      {children}
    </ErrorBoundary>
  );
}

export function CoachingErrorBoundary({ children }: SpecializedErrorBoundaryProps) {
  return (
    <ErrorBoundary
      level="page"
      context="Coaching"
      allowRecovery={true}
      fallback={<CoachingErrorFallback />}
    >
      {children}
    </ErrorBoundary>
  );
}
