# Coaching Interaction API Implementation Plan

## Overview

This document outlines the implementation plan for the coaching interaction API endpoint that will power intelligent coaching responses based on user interactions with coaching blocks. The system will use OpenRouter with GPT-4.1 for AI inference and be designed for future sophistication while starting simple.

## Current State Analysis

### Existing Coaching Block System

**Current Variants:**
- **`text`**: Markdown-rendered reflection questions with Sage icon
- **`buttons`**: Interactive horizontal button layout for actionable choices

**Current Data Structure:**
```typescript
interface CoachingBlockData {
  content: string;           // The coaching prompt text
  variant: 'text' | 'buttons'; // Display variant
  options?: string[];        // Button options (for button variant)
}
```

**Current Limitations:**
- Static content arrays in `Editor.tsx`
- No API integration for button actions
- No personalization or context awareness
- No state persistence for interactions

## Implementation Architecture

### Phase 1: Basic API Endpoint (Initial Implementation)

#### 1.1 API Endpoint Structure
**Location:** `/src/app/api/coaching-interaction/route.ts`

**HTTP Method:** `POST`

**Request Interface:**
```typescript
interface CoachingInteractionRequest {
  entryId: string;                    // Current journal entry ID
  entryContent: string;               // Current journal entry content (plain text)
  // userId is extracted from authentication (Clerk)
  // All other context is built server-side
}
```

**Response Interface:**
```typescript
interface CoachingInteractionResponse {
  success: boolean;
  coachingBlock?: {
    content: string;                  // The coaching prompt/question
    variant: 'text' | 'buttons' | 'multi-select'; // Format decided by LLM
    options?: string[];               // Options for buttons/multi-select variants
    reasoning?: string;               // Why this format was chosen (optional)
  };
  error?: string;
}
```

#### 1.2 Server-Side Context Building
The API endpoint builds comprehensive context from minimal client input:

```typescript
// Context building function (Phase 1)
async function buildCoachingContext(request: CoachingInteractionRequest, userId: string): Promise<CoachingContext> {
  // Get user alignment/goals
  const userAccount = await FirestoreAdminService.getUserAccount(userId);
  const alignment = userAccount.alignment || "Not specified";
  
  // Get recent journal entries for context
  const recentEntries = await FirestoreAdminService.getRecentJournalEntries(userId, 10);
  
  // Get any previous coaching interactions
  const coachingHistory = await FirestoreAdminService.getCoachingHistory(userId, 5);
  
  return {
    entryId: request.entryId,
    entryContent: request.entryContent,
    userAlignment: alignment,
    recentEntries,
    coachingHistory,
    userId
  };
}
```

#### 1.3 OpenRouter Integration

**Environment Variables:**
```bash
OPENROUTER_API_KEY=your_api_key_here
OPENROUTER_APP_NAME=Reflecta Labs
OPENROUTER_SITE_URL=https://reflecta.com
```

**OpenRouter Client Setup:**
```typescript
import OpenAI from 'openai';

const openrouter = new OpenAI({
  baseURL: 'https://openrouter.ai/api/v1',
  apiKey: process.env.OPENROUTER_API_KEY,
  defaultHeaders: {
    'HTTP-Referer': process.env.OPENROUTER_SITE_URL,
    'X-Title': process.env.OPENROUTER_APP_NAME,
  },
});
```

**Initial AI Prompt Structure:**
```typescript
const generateCoachingPrompt = (context: CoachingContext): string => {
  const basePrompt = `You are an experienced startup coach and mentor for founders. You provide thoughtful, actionable guidance to help entrepreneurs reflect on their journey and make better decisions.

Context:
- Current Entry: ${context.entryContent}
- User Alignment: ${context.userAlignment}
- Recent Entries: ${context.recentEntries?.map(e => `"${e.content}"`).join(', ') || 'N/A'}

Your task is to analyze this context and create the most helpful coaching intervention. You must respond with a JSON object containing:

{
  "content": "The coaching prompt/question",
  "variant": "text" | "buttons" | "multi-select",
  "options": ["option1", "option2", ...] // Only for buttons/multi-select
  "reasoning": "Why you chose this format"
}

Guidelines:
- Use "text" for deep reflection questions
- Use "buttons" for 2-5 actionable choices
- Use "multi-select" for multiple applicable options
- Keep prompts concise but meaningful
- Focus on founder-specific challenges and opportunities

Respond only with the JSON object.`;

  return basePrompt;
};
```

### Phase 2: Enhanced Context Analysis & Personalization

#### 2.1 Sophisticated Context Analysis
```typescript
interface EnhancedCoachingContext extends CoachingContext {
  patterns: {
    recentThemes: string[];           // Extracted from recent entries
    challengePatterns: string[];      // Identified recurring challenges
    successIndicators: string[];      // Positive patterns and wins
    emotionalState: string;           // Current emotional context
    actionTendencies: string[];       // How user typically responds
  };
  timing: {
    timeOfDay: string;                // Morning, afternoon, evening
    dayOfWeek: string;                // Context for different coaching approaches
    streakInfo: number;               // Days of consistent journaling
  };
  effectiveness: {
    previousInteractions: CoachingInteraction[];
    preferredFormats: string[];       // Which formats user engages with most
    responsePatterns: string[];       // How user typically responds
  };
}
```

#### 2.2 Context-Aware Prompts
```typescript
interface CoachingContext {
  recentThemes: string[];           // Extracted from recent entries
  challengePatterns: string[];      // Identified challenges
  successIndicators: string[];      // Positive patterns
  coachingHistory: CoachingInteraction[]; // Previous interactions
}

const generateContextualPrompt = (request: CoachingInteractionRequest, context: CoachingContext): string => {
  // Enhanced prompt generation using context
};
```

### Phase 3: Advanced Features

#### 3.1 Multi-Turn Conversations
```typescript
interface CoachingSession {
  sessionId: string;
  userId: string;
  startedAt: Date;
  interactions: CoachingInteraction[];
  state: 'active' | 'completed' | 'paused';
}
```

#### 3.2 Learning & Adaptation
```typescript
interface CoachingEffectiveness {
  blockId: string;
  userId: string;
  responseType: string;
  userFeedback?: 'helpful' | 'neutral' | 'unhelpful';
  followUpActions: string[];
  measuredImpact: number;
}
```

## Implementation Steps

### Step 1: Environment Setup
1. Add OpenRouter API key to environment variables
2. Install any additional dependencies if needed
3. Set up TypeScript interfaces

### Step 2: Basic API Endpoint
1. Create `/src/app/api/coaching-interaction/route.ts`
2. Implement basic POST handler with authentication
3. Add OpenRouter client configuration
4. Implement simple routing logic

### Step 3: Core Processing Functions
1. `buildCoachingContext` - Gather user context from database
2. `generateCoachingPrompt` - Create LLM prompt with context
3. `callOpenRouter` - Make API call to OpenRouter with GPT-4.1
4. `parseCoachingResponse` - Parse and validate LLM JSON response

### Step 4: Frontend Integration
1. Update `CoachingBlockExtension` to call the API
2. Add loading states and error handling
3. Implement response rendering

### Step 5: Testing & Refinement
1. Test with different block types and contexts
2. Refine prompts based on response quality
3. Add comprehensive error handling

## API Implementation Details

### Authentication
- Use existing Clerk authentication pattern
- Require authenticated users for coaching interactions
- Include user ID in all requests

### Error Handling
```typescript
const errorResponses = {
  UNAUTHORIZED: { error: 'User not authenticated', status: 401 },
  INVALID_REQUEST: { error: 'Invalid request format', status: 400 },
  AI_ERROR: { error: 'AI service temporarily unavailable', status: 503 },
  RATE_LIMITED: { error: 'Rate limit exceeded', status: 429 }
};
```

### Request Validation
```typescript
const validateRequest = (body: any): CoachingInteractionRequest => {
  // Zod schema validation
  const schema = z.object({
    entryId: z.string().min(1),
    entryContent: z.string().min(1),
    // userId comes from authentication
  });

  return schema.parse(body);
};
```

### Response Processing
```typescript
const processAIResponse = (aiResponse: string, context: CoachingContext): CoachingInteractionResponse => {
  try {
    // Parse JSON response from LLM
    const parsedResponse = JSON.parse(aiResponse);
    
    // Validate response structure
    const coachingBlock = {
      content: parsedResponse.content,
      variant: parsedResponse.variant,
      options: parsedResponse.options || undefined,
      reasoning: parsedResponse.reasoning || undefined
    };
    
    return {
      success: true,
      coachingBlock
    };
  } catch (error) {
    console.error('Failed to parse AI response:', error);
    return {
      success: false,
      error: 'Failed to generate coaching response'
    };
  }
};
```

## Database Schema Extensions

### CoachingContext Interface
```typescript
interface CoachingContext {
  entryId: string;
  entryContent: string;
  userAlignment: string;
  recentEntries: JournalEntry[];
  coachingHistory: CoachingInteraction[];
  userId: string;
}
```

### CoachingInteraction Model
```typescript
interface CoachingInteraction {
  id: string;
  userId: string;
  entryId: string;
  requestContext: {
    entryContent: string;
    userAlignment: string;
    recentEntriesCount: number;
  };
  aiResponse: {
    content: string;
    variant: 'text' | 'buttons' | 'multi-select';
    options?: string[];
    reasoning?: string;
  };
  timestamp: Date;
  effectiveness?: {
    userFeedback?: 'helpful' | 'neutral' | 'unhelpful';
    userEngagement: 'ignored' | 'viewed' | 'interacted';
    followUpActions: string[];
    measuredImpact: number;
  };
}
```

## Integration Points

### Frontend Integration
1. **CoachingBlockExtension**: Update to call API on user interactions
2. **Loading States**: Show spinner while AI processes
3. **Error Handling**: Graceful degradation for API failures
4. **Analytics**: Track interaction patterns with PostHog

### Existing Systems
1. **Morning Guidance**: Potential shared prompt generation logic
2. **AI Chat**: Similar OpenAI/AI patterns for consistency
3. **Journal Sync**: Persist coaching interactions with entries
4. **Analytics**: Track effectiveness and usage patterns

## Future Enhancements

### Phase 4: Advanced Features
1. **Coaching Sessions**: Multi-turn conversations with state
2. **Learning Algorithm**: Adapt responses based on user feedback
3. **Goal Integration**: Connect coaching to user objectives
4. **Collaboration**: Share insights with co-founders or mentors

### Phase 5: Sophistication
1. **Model Selection**: Choose best AI model for each interaction type
2. **Prompt Engineering**: A/B test different prompt strategies
3. **Personalization**: Deep user profiling for tailored responses
4. **Predictive Coaching**: Proactive suggestions based on patterns

## Testing Strategy

### Unit Tests
- Request validation logic
- Response processing functions
- Error handling scenarios

### Integration Tests
- API endpoint with mocked OpenRouter responses
- Frontend component interactions
- Database persistence

### E2E Tests
- Complete coaching interaction flow
- Different block types and scenarios
- Error recovery and edge cases

## Performance Considerations

### Caching Strategy
- Cache frequently used prompts
- Store user context for faster responses
- Implement response streaming for long AI responses

### Rate Limiting
- Implement user-level rate limiting
- Queue requests during high traffic
- Graceful degradation for API limits

### Monitoring
- Track API response times
- Monitor OpenRouter usage and costs
- Alert on error rates or failures

## Security Considerations

### API Security
- Validate all inputs thoroughly
- Sanitize user content before AI processing
- Implement proper authentication checks

### Data Privacy
- Don't log sensitive user content
- Implement proper data retention policies
- Ensure GDPR compliance for EU users

### AI Safety
- Content filtering for inappropriate responses
- Implement safeguards against prompt injection
- Monitor for bias in AI responses

## Conclusion

This implementation plan provides a clear path from a simple coaching interaction API to a sophisticated, personalized coaching system. The architecture is designed to be extensible and maintainable while starting with a minimal viable implementation.

The phased approach allows for iterative development and user feedback incorporation, ensuring the system evolves to meet actual user needs while maintaining technical excellence.

Key success metrics:
- User engagement with coaching blocks
- Quality of AI responses (user feedback)
- System performance and reliability
- Integration with existing journal workflow