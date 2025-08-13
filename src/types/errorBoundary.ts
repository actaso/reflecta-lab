import { ErrorInfo, ReactNode } from 'react';

// =====================================================================
// ERROR BOUNDARY TYPES
// Type definitions for the error boundary system
// =====================================================================

/**
 * Error boundary levels for different UI fallbacks
 */
export type ErrorBoundaryLevel = 'root' | 'page' | 'feature' | 'component';

/**
 * Error boundary component props
 */
export interface ErrorBoundaryProps {
  /** Child components to render */
  children: ReactNode;
  /** Custom fallback component to render on error */
  fallback?: ReactNode;
  /** Error boundary level for appropriate fallback UI */
  level: ErrorBoundaryLevel;
  /** Context description for error reporting */
  context?: string;
  /** Callback for custom error handling */
  onError?: (error: Error, errorInfo: ErrorInfo) => void;
  /** Whether to show retry/recovery buttons */
  allowRecovery?: boolean;
}

/**
 * Error boundary component state
 */
export interface ErrorBoundaryState {
  /** Whether an error has occurred */
  hasError: boolean;
  /** The error that occurred */
  error?: Error;
  /** Additional error information from React */
  errorInfo?: ErrorInfo;
  /** Unique error ID for tracking */
  errorId?: string;
}

/**
 * Error fallback component props
 */
export interface ErrorFallbackProps {
  /** Retry handler function */
  onRetry?: () => void;
  /** Reload handler function */
  onReload?: () => void;
  /** Error context for customized messaging */
  context?: string;
}

/**
 * Specialized error boundary props for specific components
 */
export interface SpecializedErrorBoundaryProps {
  /** Child components to render */
  children: ReactNode;
  /** Whether this error boundary should handle the error or pass it up */
  fallThrough?: boolean;
}

/**
 * Error reporting configuration
 */
export interface ErrorReportingConfig {
  /** Whether to enable error reporting in this environment */
  enabled: boolean;
  /** Service to report errors to (e.g., 'sentry', 'bugsnag') */
  service?: string;
  /** Additional metadata to include with error reports */
  metadata?: Record<string, unknown>;
}
