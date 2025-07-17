# Analytics Implementation Guide

This document details the analytics implementation in Reflecta Labs, covering event tracking, user identification, and morning guidance analytics.

## Overview

Reflecta uses **PostHog** for comprehensive user behavior tracking and product analytics. The implementation follows privacy-first principles with user identification only for authenticated users.

## Analytics Architecture

### Core Hook: `useAnalytics`
Location: `src/hooks/useAnalytics.ts`

The main analytics hook provides:
- User identification for authenticated users
- Debounced events to prevent spam
- Rich metadata collection
- Type-safe event tracking functions

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

### 1. Core User Actions
- `page_view` - Initial app load and navigation
- `entry_created` - New journal entry creation
- `entry_updated` - Journal entry content changes (debounced 500ms)
- `user_signed_in` - Authentication with existing data migration info
- `user_signed_up` - New user registration
- `user_signed_out` - User logout

### 2. Morning Guidance Analytics
- `morning_guidance_generated` - Daily prompt generation
- `morning_guidance_used` - User clicks "Journal Now"
- `morning_guidance_modal_opened` - User expands detailed view
- `alignment_set` - User sets/updates their main objective

### 3. Coaching Analytics
- `coaching_completion` - AI coaching block generation completed

### 4. Event Properties

#### Morning Guidance Events
```typescript
// Generation tracking
{
  timestamp: string,
  from_cache: boolean,        // Whether served from cache
  entry_count: number,        // User's total entries
  has_alignment: boolean      // Whether user has set alignment
}

// Usage tracking
{
  timestamp: string,
  use_detailed_prompt: boolean, // Used modal vs. direct button
  entry_count: number,
  has_alignment: boolean
}

// Alignment tracking
{
  timestamp: string,
  alignment_length: number,   // Character count
  is_update: boolean         // Whether updating existing
}
```

#### Coaching Events
```typescript
// Coaching completion tracking
{
  timestamp: string,
  model_id: string,          // Which AI model was used
  variant: string,           // Display variant (text, buttons)
  entry_id: string,          // Associated journal entry
  content_length: number,    // Length of generated content
  has_options: boolean,      // Whether coaching block has options
  option_count: number       // Number of options provided
}
```

## Implementation Patterns

### 1. Component Integration
```typescript
// Import analytics hook
import { useAnalytics } from '@/hooks/useAnalytics';

// Destructure needed tracking functions
const {
  trackMorningGuidanceGenerated,
  trackMorningGuidanceUsed
} = useAnalytics();

// Track events at appropriate moments
useEffect(() => {
  if (data.generated) {
    trackMorningGuidanceGenerated({
      fromCache: data.fromCache,
      entryCount: entries.length,
      hasAlignment: Boolean(userAlignment)
    });
  }
}, [data]);
```

### 2. Debounced Events
Content updates use 500ms debouncing to prevent excessive events:
```typescript
const trackEntryUpdated = useCallback((entryId: string, contentLength: number) => {
  if (debounceRef.current) {
    clearTimeout(debounceRef.current);
  }

  debounceRef.current = setTimeout(() => {
    posthog?.capture('entry_updated', {
      entry_id: entryId,
      content_length: contentLength,
      timestamp: new Date().toISOString(),
    });
  }, 500);
}, [posthog]);
```

### 3. Error Handling
Analytics failures don't impact user experience:
```typescript
try {
  // Track successful action
  trackMorningGuidanceUsed(properties);
  performAction();
} catch (error) {
  // Still track on error for complete funnel analysis
  trackMorningGuidanceUsed(properties);
  handleError(error);
}
```

## Morning Guidance Analytics Flow

### Generation Funnel
1. **User visits app** → `page_view`
2. **Guidance generated** → `morning_guidance_generated`
3. **User expands details** → `morning_guidance_modal_opened` (optional)
4. **User journals** → `morning_guidance_used`
5. **User sets alignment** → `alignment_set` (if needed)

### Key Metrics
- **Generation Rate**: How often prompts are created vs. served from cache
- **Usage Rate**: Percentage of generated prompts that lead to journaling
- **Modal Engagement**: How often users need detailed explanations
- **Alignment Adoption**: Percentage of users who set objectives

## Privacy Considerations

### Data Collection
- **Anonymous users**: Basic interaction events without personal identification
- **Authenticated users**: Full event tracking with user identification
- **No PII in events**: Content is never tracked, only metadata like length

### Compliance
- Events include only behavioral data and system metrics
- User content is never transmitted to analytics
- Identification only occurs after explicit authentication

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
1. **User Journey**: Sign up → First journal → Morning guidance usage
2. **Feature Adoption**: Morning guidance generation and usage rates
3. **Engagement Patterns**: Daily/weekly active users and retention
4. **Content Metrics**: Average entry length and frequency

## Best Practices

### 1. Event Naming
- Use snake_case for consistency
- Include action context (e.g., `morning_guidance_used` not `guidance_used`)
- Be specific about user intent

### 2. Property Design
- Include timestamp in all events
- Add context like `entry_count` for cohort analysis
- Use boolean flags for feature usage tracking

### 3. Performance
- Debounce high-frequency events
- Avoid tracking in event handlers that fire rapidly
- Use useCallback for tracking functions to prevent re-renders

### 4. Testing
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
- **AI Chat Usage**: Track mode selection and conversation length
- **Search Patterns**: Command palette usage and query types
- **Import/Export**: Backup and restore feature usage
- **Performance Metrics**: Load times and sync efficiency

### Advanced Segmentation
- User cohorts by journal frequency
- Feature adoption by user type (daily vs. occasional)
- Morning guidance effectiveness by alignment clarity