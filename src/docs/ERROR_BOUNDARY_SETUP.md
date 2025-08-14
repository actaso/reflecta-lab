# Error Boundary System - Production Setup Guide

## 🛡️ Overview

The Reflecta Labs error boundary system provides comprehensive error handling with production-ready error reporting integration.

## 📁 Project Structure

```
src/
├── types/
│   └── errorBoundary.ts          # Type definitions
├── hooks/
│   └── useErrorBoundary.ts       # Programmatic error handling hook
├── components/
│   └── error-boundaries/
│       ├── ErrorBoundary.tsx     # Core error boundary component
│       ├── SpecializedErrorBoundaries.tsx  # Pre-configured boundaries
│       ├── fallbacks/            # Fallback UI components
│       │   ├── RootErrorFallback.tsx
│       │   ├── PageErrorFallback.tsx
│       │   ├── FeatureErrorFallback.tsx
│       │   ├── ComponentErrorFallback.tsx
│       │   ├── AIErrorFallback.tsx
│       │   ├── EditorErrorFallback.tsx
│       │   ├── CoachingErrorFallback.tsx
│       │   └── index.ts
│       └── index.ts              # Centralized exports
└── lib/
    └── errorReporting.ts         # External error reporting service integration
```

## 🚀 Current Integration Status

### ✅ Implemented
- ✅ Error boundary hierarchy (Root → Page → Feature → Component)
- ✅ Type-safe error handling with TypeScript
- ✅ Specialized error boundaries (AI, Editor, Sidebar, Coaching)
- ✅ Production-safe error logging (no sensitive data exposure)
- ✅ Custom fallback UIs matching design system
- ✅ Programmatic error handling hook
- ✅ Integration in all main pages:
  - ✅ Root layout (`app/layout.tsx`)
  - ✅ Journal page (`app/page.tsx`)
  - ✅ Coach page (`app/coach/page.tsx`)
  - ✅ Compass page (`app/compass/page.tsx`)

### 🔄 Integration Points Ready
- 🔄 External error reporting service integration (Sentry, Bugsnag, Rollbar)
- 🔄 User context injection for error reports
- 🔄 Custom error metadata collection

## 🔧 Environment Variables

Add these environment variables for production error reporting:

```bash
# Error Reporting Service (optional)
NEXT_PUBLIC_ERROR_REPORTING_SERVICE=sentry  # Options: sentry, bugsnag, rollbar
NEXT_PUBLIC_APP_VERSION=1.0.0

# Sentry (if using Sentry)
NEXT_PUBLIC_SENTRY_DSN=https://your-dsn@sentry.io/project-id

# Bugsnag (if using Bugsnag)
NEXT_PUBLIC_BUGSNAG_API_KEY=your-bugsnag-api-key

# Rollbar (if using Rollbar)
NEXT_PUBLIC_ROLLBAR_ACCESS_TOKEN=your-rollbar-token
```

## 📋 Usage Examples

### Basic Error Boundary Usage
```tsx
import { ErrorBoundary } from '@/components/error-boundaries';

function MyComponent() {
  return (
    <ErrorBoundary level="component" context="My Component">
      <SomeComponent />
    </ErrorBoundary>
  );
}
```

### Specialized Error Boundaries
```tsx
import { 
  AIErrorBoundary, 
  EditorErrorBoundary, 
  SidebarErrorBoundary 
} from '@/components/error-boundaries';

function App() {
  return (
    <div>
      <SidebarErrorBoundary>
        <Sidebar />
      </SidebarErrorBoundary>
      
      <AIErrorBoundary>
        <ChatInterface />
      </AIErrorBoundary>
      
      <EditorErrorBoundary>
        <Editor />
      </EditorErrorBoundary>
    </div>
  );
}
```

### Programmatic Error Handling
```tsx
import { useErrorBoundary } from '@/hooks/useErrorBoundary';

function MyComponent() {
  const { triggerErrorBoundary, reportError, withErrorHandling } = useErrorBoundary();
  
  // Trigger error boundary programmatically
  const handleError = () => {
    triggerErrorBoundary(new Error('Something went wrong'));
  };
  
  // Report error without triggering boundary
  const handleAsyncError = async () => {
    try {
      await someAsyncOperation();
    } catch (error) {
      reportError(error, 'Async Operation Failed');
    }
  };
  
  // Safe async wrapper
  const safeAsyncOperation = withErrorHandling(
    async (data) => {
      return await processData(data);
    },
    'Data Processing'
  );
}
```

## 🏗️ Error Boundary Hierarchy

```
RootLayout (Root Level)
├── Authentication (Feature Level)
├── Application Root (Root Level)
│   ├── Global Navigation (Component Level)
│   └── Page Content (Page Level)
│       ├── Sidebar (Feature Level - SidebarErrorBoundary)
│       ├── AI Features (Feature Level - AIErrorBoundary)
│       ├── Editor (Feature Level - EditorErrorBoundary)
│       ├── Entry Header (Component Level)
│       ├── Help Modal (Component Level)
│       └── Command Palette (Component Level)
```

## 🛠️ Setting Up External Error Reporting

### Option 1: Sentry Setup

1. **Install Sentry SDK:**
   ```bash
   npm install @sentry/nextjs
   ```

2. **Initialize Sentry:**
   ```bash
   npx @sentry/wizard -i nextjs
   ```

3. **Uncomment Sentry code in `src/lib/errorReporting.ts`**

4. **Add environment variable:**
   ```bash
   NEXT_PUBLIC_ERROR_REPORTING_SERVICE=sentry
   NEXT_PUBLIC_SENTRY_DSN=your-dsn
   ```

### Option 2: Bugsnag Setup

1. **Install Bugsnag SDK:**
   ```bash
   npm install @bugsnag/js
   ```

2. **Uncomment Bugsnag code in `src/lib/errorReporting.ts`**

3. **Add environment variable:**
   ```bash
   NEXT_PUBLIC_ERROR_REPORTING_SERVICE=bugsnag
   NEXT_PUBLIC_BUGSNAG_API_KEY=your-api-key
   ```

### Option 3: Rollbar Setup

1. **Install Rollbar SDK:**
   ```bash
   npm install rollbar
   ```

2. **Uncomment Rollbar code in `src/lib/errorReporting.ts`**

3. **Add environment variable:**
   ```bash
   NEXT_PUBLIC_ERROR_REPORTING_SERVICE=rollbar
   NEXT_PUBLIC_ROLLBAR_ACCESS_TOKEN=your-token
   ```

## 🔒 Security Considerations

- ❌ **Never expose sensitive data** in error messages
- ✅ **Error IDs are generated** for tracking without exposing internals
- ✅ **Stack traces only logged in development**
- ✅ **Error messages truncated** in production
- ✅ **User data sanitized** before reporting

## 🧪 Testing Error Boundaries

Error boundaries can be tested using the development test pages:

1. **Basic Error Boundary Test:**
   ```
   /error-boundary-test
   ```

2. **Journal Integration Test:**
   ```
   /error-boundary-journal-test?crash=ai,editor,sidebar
   ```

## 📈 Monitoring and Metrics

With external error reporting enabled, you can monitor:

- Error frequency by component
- Error trends over time
- User impact analysis
- Performance correlation
- Browser/device breakdown

## 🔄 Future Enhancements

- [ ] Error boundary performance metrics
- [ ] User feedback collection on errors
- [ ] Automatic retry mechanisms
- [ ] Error boundary A/B testing
- [ ] Custom error boundary themes
- [ ] Error recovery analytics
