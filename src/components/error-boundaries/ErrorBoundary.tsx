'use client';

import React, { Component } from 'react';
import type { 
  ErrorBoundaryProps, 
  ErrorBoundaryState, 
  ErrorReportingConfig 
} from '@/types/errorBoundary';
import { 
  RootErrorFallback,
  PageErrorFallback,
  FeatureErrorFallback,
  ComponentErrorFallback
} from './fallbacks';

// =====================================================================
// SECURITY NOTE: Error boundaries NEVER expose sensitive information
// - Error messages are user-friendly and generic
// - Stack traces are only logged in development
// - No user data or API keys are ever shown in UI
// =====================================================================

export class ErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  public state: ErrorBoundaryState = {
    hasError: false
  };

  public static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    // Generate unique error ID for tracking (safe for production)
    const errorId = `err_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    return { 
      hasError: true, 
      error,
      errorId
    };
  }

  public componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    this.setState({ errorInfo });
    
    // SECURITY: Only log detailed errors in development
    if (process.env.NODE_ENV === 'development') {
      console.error(`🚨 ErrorBoundary (${this.props.level}):`, {
        context: this.props.context,
        error: error.message,
        stack: error.stack,
        componentStack: errorInfo.componentStack,
        errorId: this.state.errorId
      });
    } else {
      // Production: Minimal, safe logging
      console.error(`Error ${this.state.errorId}:`, {
        level: this.props.level,
        context: this.props.context || 'unknown',
        message: error.message.substring(0, 100) // Truncate for safety
      });
    }
    
    // Custom error reporting callback (safe)
    if (this.props.onError) {
      this.props.onError(error, errorInfo);
    }

    // Future: Integration point for error reporting services
    this.reportToExternalService(error, errorInfo);
  }

  private reportToExternalService(error: Error, errorInfo: React.ErrorInfo) {
    // Integration point for production error reporting
    // This is where Sentry, Bugsnag, etc. would be integrated
    
    const config: ErrorReportingConfig = {
      enabled: process.env.NODE_ENV === 'production',
      service: process.env.NEXT_PUBLIC_ERROR_REPORTING_SERVICE,
      metadata: {
        level: this.props.level,
        context: this.props.context,
        errorId: this.state.errorId,
        componentStack: errorInfo.componentStack
      }
    };

    if (config.enabled && config.service) {
      // TODO: Implement actual error reporting integration
      // Example implementations:
      // 
      // if (config.service === 'sentry') {
      //   Sentry.captureException(error, {
      //     extra: config.metadata,
      //     tags: { errorBoundary: this.props.level }
      //   });
      // }
      //
      // if (config.service === 'bugsnag') {
      //   Bugsnag.notify(error, (event) => {
      //     event.addMetadata('errorBoundary', config.metadata);
      //   });
      // }
    }
  }

  private handleRetry = () => {
    this.setState({ 
      hasError: false, 
      error: undefined, 
      errorInfo: undefined,
      errorId: undefined
    });
  };

  private handleReload = () => {
    // Clear any localStorage errors state if needed
    window.location.reload();
  };

  public render() {
    if (this.state.hasError) {
      // Use custom fallback if provided
      if (this.props.fallback) {
        return this.props.fallback;
      }
      
      // Render appropriate fallback based on level
      return this.renderFallbackUI();
    }

    return this.props.children;
  }

  private renderFallbackUI() {
    const { level, context, allowRecovery = true } = this.props;
    
    switch (level) {
      case 'root':
        return <RootErrorFallback onReload={this.handleReload} />;
      case 'page':
        return <PageErrorFallback onRetry={this.handleRetry} onReload={this.handleReload} />;
      case 'feature':
        return <FeatureErrorFallback context={context} onRetry={allowRecovery ? this.handleRetry : undefined} />;
      case 'component':
        return <ComponentErrorFallback context={context} onRetry={allowRecovery ? this.handleRetry : undefined} />;
      default:
        return <FeatureErrorFallback context="Unknown" onRetry={this.handleRetry} />;
    }
  }
}

export default ErrorBoundary;
