import { useCallback } from 'react';
import type { ErrorReportingConfig } from '@/types/errorBoundary';

/**
 * Hook for programmatic error handling and reporting
 * Provides utilities for throwing errors that will be caught by error boundaries
 * and reporting errors to external services
 */
export function useErrorBoundary() {
  /**
   * Programmatically trigger an error boundary
   * Useful for handling async errors or errors in event handlers
   */
  const triggerErrorBoundary = useCallback((error: Error | string) => {
    const errorObj = typeof error === 'string' ? new Error(error) : error;
    
    // Add error boundary metadata
    errorObj.name = errorObj.name || 'UserTriggeredError';
    
    // Throw the error to be caught by the nearest error boundary
    throw errorObj;
  }, []);

  /**
   * Report an error to external services without triggering error boundary
   * Useful for logging errors that shouldn't crash the UI
   */
  const reportError = useCallback((
    error: Error,
    context?: string,
    config?: ErrorReportingConfig
  ) => {
    const errorId = `err_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    
    // Development logging
    if (process.env.NODE_ENV === 'development') {
      console.error(`🐛 Reported Error (${context || 'unknown'}):`, {
        error: error.message,
        stack: error.stack,
        errorId,
        metadata: config?.metadata
      });
    }
    
    // Production error reporting
    if (process.env.NODE_ENV === 'production' && config?.enabled) {
      // Integration point for error reporting services
      // This is where you'd integrate Sentry, Bugsnag, etc.
      console.error(`Error ${errorId}:`, {
        message: error.message.substring(0, 100),
        context: context || 'unknown',
        service: config.service,
        metadata: config.metadata
      });
      
      // TODO: Add actual error reporting service integration
      // Example:
      // if (config.service === 'sentry') {
      //   Sentry.captureException(error, { extra: config.metadata });
      // }
    }
    
    return errorId;
  }, []);

  /**
   * Safe async wrapper that catches errors and reports them
   * Prevents unhandled promise rejections
   */
  const withErrorHandling = useCallback(<T extends unknown[], R>(
    fn: (...args: T) => Promise<R>,
    context?: string,
    shouldThrow = false
  ) => {
    return async (...args: T): Promise<R | null> => {
      try {
        return await fn(...args);
      } catch (error) {
        const err = error instanceof Error ? error : new Error(String(error));
        
        // Report the error
        reportError(err, context);
        
        // Optionally trigger error boundary
        if (shouldThrow) {
          triggerErrorBoundary(err);
        }
        
        return null;
      }
    };
  }, [reportError, triggerErrorBoundary]);

  return {
    triggerErrorBoundary,
    reportError,
    withErrorHandling
  };
}
