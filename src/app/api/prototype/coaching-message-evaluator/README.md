# Coaching Message Evaluator

An intelligent AI-powered system that evaluates whether to send coaching messages to users and determines the optimal content and timing.

## Overview

The Coaching Message Evaluator uses a two-step AI evaluation process to ensure high-quality, contextually appropriate coaching messages:

1. **Impact Evaluation**: Analyzes user context to determine the most impactful message type
2. **Outcome Simulation**: Simulates user response and makes final send/don't-send decision

## Architecture

```
coaching-message-evaluator/
├── route.ts                    # API endpoint (GET/POST)
├── types.ts                    # TypeScript types and Zod schemas
├── logic.ts                    # Core evaluation logic
├── prompts/
│   ├── impact-evaluation.md    # Step 1: Message type evaluation
│   └── outcome-simulation.md   # Step 2: Quality assessment
└── README.md                   # This file
```

## Message Types

| Type | Description | Best Used When |
|------|-------------|----------------|
| `check_in` | Accountability check-ins | User has goals/commitments to track |
| `encouragement` | Positive reinforcement | User has made progress or needs motivation |
| `challenge` | Growth opportunities | User is ready for supportive challenges |
| `reminder` | Gentle nudges | User mentioned wanting to do something |
| `alignment_reflection` | Core purpose questions | User needs direction clarity |
| `general_reflection` | Self-understanding questions | User would benefit from introspection |
| `personal_insight` | Pattern-based insights | Meaningful patterns identified in user data |
| `relevant_lesson` | Applicable wisdom | User facing challenges that need reframing |

## API Usage

### Endpoint
```
POST /api/prototype/coaching-message-evaluator
```

### Request Body
```json
{
  "userId": "user123"
}
```

### Response Format
```json
{
  "success": true,
  "userId": "user123",
  "shouldSend": true,
  "message": {
    "id": "msg456",
    "userId": "user123",
    "messageType": "check_in",
    "content": "How are you feeling about your morning routine goals this week?",
    "generatedAt": "2024-01-01T12:00:00.000Z",
    "sentAt": "2024-01-01T12:00:00.000Z",
    "aiMetadata": {
      "confidenceScore": 0.85,
      "reasoningSteps": [
        "Impact: User has been consistent with journaling...",
        "Outcome: User appears receptive to accountability..."
      ]
    }
  },
  "reasoning": "User has been consistent with journaling and mentioned goals around morning routines. A check-in would provide valuable accountability without being overwhelming.",
  "timestamp": "2024-01-01T12:00:00.000Z"
}
```

### No-Send Response
```json
{
  "success": true,
  "userId": "user123",
  "shouldSend": false,
  "message": null,
  "reasoning": "User received a message yesterday and appears to be processing recent challenges. Better to wait before sending another message.",
  "timestamp": "2024-01-01T12:00:00.000Z"
}
```

## Data Sources

The evaluator gathers context from:

- **Recent Coaching Messages** (last 10): Prevents over-messaging and considers timing
- **Alignment Document**: User's core purpose and life direction
- **Journal Entries** (last 20): Current state, patterns, and needs
- **User Activity**: Engagement patterns and receptivity indicators

## Database Schema

### Collection: `coachingMessages`
```typescript
{
  id: string;
  userId: string;
  messageType: MessageType;
  content: string;
  generatedAt: Date;
  sentAt?: Date;              // null if not sent
  userEngagement?: {
    readAt?: Date;
    dismissedAt?: Date;
    repliedAt?: Date;
  };
  aiMetadata: {
    confidenceScore: number;   // 0-1 scale
    reasoningSteps: string[];
  };
}
```

## Testing

### Manual Testing
```bash
curl -X POST http://localhost:3000/api/prototype/coaching-message-evaluator \
  -H "Content-Type: application/json" \
  -d '{"userId": "test-user-123"}'
```

### Test Scenarios

1. **New User**: No prior messages, no alignment doc
2. **Active User**: Recent journal entries, established alignment
3. **Inactive User**: No recent activity, previous messages sent
4. **Overwhelmed User**: Recent struggles indicated in journal entries

## AI Evaluation Process

### Step 1: Impact Evaluation
- Analyzes user's current state and context
- Evaluates 8 different message types for relevance
- Scores contextual relevance (0-10) and potential impact (0-10)
- Generates initial message content

### Step 2: Outcome Simulation
- Simulates specific user's likely response
- Evaluates message quality (0-10)
- Assesses risks and timing appropriateness
- Makes final SEND/DONT_SEND decision
- Refines message content

## Quality Assurance

### Send Criteria
- Message quality ≥ 7/10
- No significant risks identified
- User appears receptive
- Genuine value added to user journey

### Risk Mitigation
- Overwhelm detection
- Frequency controls
- Misinterpretation prevention
- Boundary respect
- Timing sensitivity

## Future Enhancements

- **Cron Scheduling**: Automated daily/weekly evaluations
- **Push Notifications**: Replace console.log with actual sending
- **A/B Testing**: Message variant testing
- **User Preferences**: Respect quiet hours and frequency settings
- **Analytics**: Track engagement and effectiveness metrics

## Error Handling

- Graceful degradation when data sources unavailable
- Structured error responses with details
- Comprehensive logging for debugging
- Fallback behaviors for AI service issues

## Performance Considerations

- Parallel data fetching for context gathering
- Efficient Firestore queries with proper indexing
- Response caching for repeated evaluations
- Timeout handling for AI API calls

## Security & Privacy

- No authentication required for testing (temporary)
- User data access limited to relevant coaching context
- AI processing through secure OpenRouter API
- Message storage with appropriate data retention policies 