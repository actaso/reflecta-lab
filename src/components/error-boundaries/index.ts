// =====================================================================
// ERROR BOUNDARY EXPORTS
// Centralized exports for clean imports throughout the application
// =====================================================================

// Core error boundary component
export { ErrorBoundary } from './ErrorBoundary';

// Specialized error boundaries
export { 
  AIErrorBoundary,
  EditorErrorBoundary,
  SidebarErrorBoundary,
  CoachingErrorBoundary
} from './SpecializedErrorBoundaries';

// Fallback components
export * from './fallbacks';

// =====================================================================
// USAGE EXAMPLES:
// 
// Root level:
// import { ErrorBoundary } from '@/components/error-boundaries';
// <ErrorBoundary level="root">...</ErrorBoundary>
//
// Feature specific:
// import { AIErrorBoundary, EditorErrorBoundary } from '@/components/error-boundaries';
// <AIErrorBoundary>...</AIErrorBoundary>
// <EditorErrorBoundary>...</EditorErrorBoundary>
//
// Hook usage:
// import { useErrorBoundary } from '@/hooks/useErrorBoundary';
// const { triggerErrorBoundary, reportError } = useErrorBoundary();
// =====================================================================
