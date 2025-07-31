# Analytics Implementation Guide

This document details the analytics implementation in Reflecta Labs, covering event tracking, user identification, and coaching session analytics across web and mobile platforms.

## Overview

Reflecta uses **PostHog** for comprehensive user behavior tracking and product analytics. The implementation follows privacy-first principles with user identification only for authenticated users.

Guide on how to use posthog in react native: https://posthog.com/docs/libraries/react-native

## Analytics Architecture

### Core Hook: `useAnalytics`
Location: `src/hooks/useAnalytics.ts`

The main analytics hook provides:
- User identification for authenticated users
- Debounced events to prevent spam
- Rich metadata collection
- Type-safe event tracking functions
- Cross-platform consistency (web and mobile)

### User Identification
```typescript
// Automatic identification for authenticated users
if (user && posthog) {
  posthog.identify(user.id, {
    email: user.emailAddresses[0]?.emailAddress,
    name: user.fullName,
  });
}
```

## Event Categories

### 1. Core Authentication
- `user_signed_up` - New user registration
- `sign_in` - User authentication  
- `user_signed_out` - User logout

### 2. App Lifecycle
- `app_opened` - App launch/foreground (mobile) or page load (web)
- `app_opened_from_coaching_message` - App opened via coaching notification/message

### 3. Journal Actions
- `journal_entry_created` - New journal entry creation
- `journal_entry_updated` - Journal entry content changes (debounced 500ms)
- `journal_entry_deleted` - Journal entry deletion

### 4. Coaching Features
- `coaching_session_started` - AI coaching session initiation
- `coaching_session_message_sent` - Message sent within a coaching session
- `coaching_session_completed` - Coaching session ended
- `coaching_message_sent` - Standalone coaching message (outside sessions)

## Event Properties

### Common Parameters
All events include these standard properties:
```typescript
{
  timestamp: string,           // ISO string, automatically added
  platform: 'web' | 'ios' | 'android',  // Platform identifier
  app_version?: string,        // App version (mobile apps)
}
```

### Authentication Events
```typescript
// user_signed_up & sign_in
{
  provider: string,            // Auth provider (e.g., 'google', 'apple', 'email')
  platform: string,
  app_version?: string
}

// user_signed_out
{
  platform: string,
  app_version?: string
}
```

### Journal Events
```typescript
// journal_entry_created, journal_entry_updated, journal_entry_deleted
{
  platform: string,
  app_version?: string,
  entry_id?: string,           // For updates and deletions
  content_length?: number      // For created and updated entries
}
```

### Coaching Events
```typescript
// coaching_session_started, coaching_session_message_sent, coaching_session_completed
{
  coaching_session_id: string, // Custom generated session identifier
  platform: string,
  app_version?: string,
  message_count?: number,      // For completed sessions
  duration_seconds?: number    // For completed sessions
}

// coaching_message_sent (standalone)
{
  platform: string,
  app_version?: string
}
```

## Implementation Patterns

### 1. Component Integration
```typescript
// Import analytics hook
import { useAnalytics } from '@/hooks/useAnalytics';

// Destructure needed tracking functions
const {
  trackUserSignedUp,
  trackJournalEntryCreated,
  trackCoachingSessionStarted
} = useAnalytics();

// Track events at appropriate moments
const handleSignUp = async (provider: string) => {
  try {
    await performSignUp();
    trackUserSignedUp({ provider });
  } catch (error) {
    // Handle error
  }
};
```

### 2. Cross-Platform Consistency
```typescript
// Platform detection (example)
const platform = useMemo(() => {
  if (typeof window !== 'undefined') return 'web';
  // React Native platform detection would go here
  return Platform.OS; // 'ios' | 'android'
}, []);

// Include platform in all events
trackJournalEntryCreated({ platform });
```

### 3. Debounced Events
Content updates use 500ms debouncing to prevent excessive events:
```typescript
const trackJournalEntryUpdated = useCallback((entryId: string, contentLength: number) => {
  if (debounceRef.current) {
    clearTimeout(debounceRef.current);
  }

  debounceRef.current = setTimeout(() => {
    posthog?.capture('journal_entry_updated', {
      entry_id: entryId,
      content_length: contentLength,
      platform,
      timestamp: new Date().toISOString(),
    });
  }, 500);
}, [posthog, platform]);
```

### 4. Coaching Session Tracking
```typescript
// Generate unique session ID
const coachingSessionId = useMemo(() => `session_${Date.now()}_${Math.random()}`, []);

// Track session lifecycle
useEffect(() => {
  trackCoachingSessionStarted({ 
    coachingSessionId,
    platform 
  });
  
  return () => {
    trackCoachingSessionCompleted({ 
      coachingSessionId,
      messageCount: messages.length,
      durationSeconds: Math.floor((Date.now() - sessionStartTime) / 1000),
      platform
    });
  };
}, []);
```

## Coaching Session Analytics Flow

### Session Lifecycle
1. **User starts coaching** → `coaching_session_started`
2. **User sends messages** → `coaching_session_message_sent` (each message)
3. **User ends session** → `coaching_session_completed`
4. **Standalone messages** → `coaching_message_sent` (outside sessions)

### Key Metrics
- **Session Initiation Rate**: How often users start coaching sessions
- **Session Engagement**: Average messages per session
- **Session Duration**: Time spent in coaching conversations
- **Completion Rate**: Percentage of started sessions that complete naturally

## Privacy Considerations

### Data Collection
- **Anonymous users**: Basic interaction events without personal identification
- **Authenticated users**: Full event tracking with user identification
- **No PII in events**: Content is never tracked, only metadata like length

### Compliance
- Events include only behavioral data and system metrics
- User content is never transmitted to analytics
- Identification only occurs after explicit authentication
- Platform information helps with feature rollout and debugging

## Debugging and Monitoring

### Development
```typescript
// Events are logged in development mode
if (process.env.NODE_ENV === 'development') {
  console.log('Analytics event:', eventName, properties);
}
```

### PostHog Dashboard
Key dashboards to monitor:
1. **User Journey**: Sign up → First journal → Coaching usage
2. **Platform Distribution**: Usage across web, iOS, and Android
3. **Coaching Engagement**: Session frequency, duration, and completion rates
4. **Journal Activity**: Entry creation, updates, and deletion patterns

## Best Practices

### 1. Event Naming
- Use snake_case for consistency
- Include action context (e.g., `coaching_session_started` not `session_started`)
- Be specific about user intent

### 2. Property Design
- Include timestamp in all events (handled automatically)
- Add platform information for cross-platform analysis
- Use consistent property names across related events

### 3. Performance
- Debounce high-frequency events (journal updates)
- Avoid tracking in event handlers that fire rapidly
- Use useCallback for tracking functions to prevent re-renders

### 4. Cross-Platform Implementation
- Ensure identical event names and property structures
- Use platform-appropriate detection methods
- Test events on all supported platforms

### 5. Testing
```typescript
// Mock PostHog in tests
jest.mock('posthog-js/react', () => ({
  usePostHog: () => ({
    capture: jest.fn(),
    identify: jest.fn(),
  }),
}));
```

## Future Enhancements

### Planned Analytics
- **Search Patterns**: Command palette usage and query types
- **Import/Export**: Backup and restore feature usage
- **Performance Metrics**: Load times and sync efficiency
- **Onboarding Flow**: Step completion and drop-off analysis

### Advanced Segmentation
- User cohorts by platform and journal frequency
- Coaching engagement patterns by user type
- Cross-platform feature adoption analysis