/**
 * COMMITMENT DETECTION API ROUTE
 * 
 * This endpoint analyzes coaching conversation to detect new commitments and immediately
 * saves them to the 'commitments' Firestore collection. It provides intelligent duplicate
 * prevention by querying existing commitments for the session.
 * 
 * ARCHITECTURE:
 * - Single source of truth: 'commitments' collection in Firestore
 * - Immediate persistence: Detected commitments saved with status 'detected'
 * - Smart context: Queries existing commitments to avoid LLM duplicates
 * - Atomic operation: Detection + context query + save in one API call
 * 
 * FEATURES:
 * - LLM-powered commitment detection using Claude Haiku
 * - Robust JSON parsing with repair utilities
 * - Duplicate prevention through existing commitment context
 * - Immediate Firestore persistence
 * - Comprehensive error handling and logging
 * 
 * REQUEST:
 * - conversationHistory: Array of coaching messages to analyze
 * - sessionId: Required string for context queries and persistence
 * 
 * RESPONSE:
 * - success: Boolean indicating operation success
 * - commitmentDetected: Boolean indicating if new commitment found
 * - commitment: Full commitment document (if detected and saved)
 * - error: String error message (if operation failed)
 */

import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { waitUntil } from '@vercel/functions';
import OpenAI from 'openai';
import { z } from 'zod';
import { jsonrepair } from 'jsonrepair';
import { Langfuse } from 'langfuse';

// Import types and utilities
import {
  CommitmentDeadline,
  CommitmentDetectionRequest,
  Commitment
} from '@/types/commitment';
import FirestoreAdminService from '@/lib/firestore-admin';

interface CoachingMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: Date;
}

// Zod schema for LLM response validation - with thinking field first
const CommitmentDetectionResponseSchema = z.object({
  thinking: z.string().min(10).max(1000), // LLM's step-by-step reasoning
  commitmentDetected: z.boolean(),
  commitment: z.object({
    title: z.string().min(5).max(200),
    suggestedDeadline: z.enum(['tomorrow', 'in 2 days', 'next week', 'next month'] as const)
  }).nullable(), // Allow null when no commitment detected
  confidence: z.number().min(0).max(100),
  reasoning: z.string().min(10).max(500)
});

type LLMCommitmentDetectionResponse = z.infer<typeof CommitmentDetectionResponseSchema>;

/**
 * Utilities for safer JSON handling from LLMs
 */
function stripCodeFences(text: string): string {
  // First try to extract from code fences
  const fencedBlockMatch = text.match(/```(?:json)?\n([\s\S]*?)```/i);
  if (fencedBlockMatch && fencedBlockMatch[1]) {
    return fencedBlockMatch[1].trim();
  }
  
  // If no code fences, try to extract just the JSON object
  const jsonMatch = text.match(/\{[\s\S]*\}/);
  if (jsonMatch) {
    return jsonMatch[0].trim();
  }
  
  return text.trim();
}

function normalizeSmartQuotes(text: string): string {
  return text
    .replace(/[\u201C\u201D\u201E\u201F\u2033]/g, '"')
    .replace(/[\u2018\u2019\u201A\u201B\u2032]/g, "'");
}

function tryParseJsonOrRepair(raw: string): unknown {
  const candidate = normalizeSmartQuotes(stripCodeFences(raw));
  try {
    return JSON.parse(candidate);
  } catch {
    const repaired = jsonrepair(candidate);
    return JSON.parse(repaired);
  }
}

/**
 * Transform LLM response to fix common issues
 */
function transformLLMResponse(response: Record<string, unknown>): Record<string, unknown> {
  if (!response || typeof response !== 'object') return response;
  
  // Normalize deadline to one of our 4 valid values
  if (response.commitment && typeof response.commitment === 'object' && 'suggestedDeadline' in response.commitment) {
    const deadline = String(response.commitment.suggestedDeadline).toLowerCase();
    
    // Simple keyword matching - if it contains these words, map to our values
    if (deadline.includes('tomorrow') || deadline.includes('today')) {
      (response.commitment as Record<string, unknown>).suggestedDeadline = 'tomorrow';
    } else if (deadline.includes('2 days') || deadline.includes('week') && !deadline.includes('next')) {
      (response.commitment as Record<string, unknown>).suggestedDeadline = 'in 2 days';
    } else if (deadline.includes('next week') || deadline.includes('week')) {
      (response.commitment as Record<string, unknown>).suggestedDeadline = 'next week';
    } else if (deadline.includes('month')) {
      (response.commitment as Record<string, unknown>).suggestedDeadline = 'next month';
    } else {
      // Default fallback
      (response.commitment as Record<string, unknown>).suggestedDeadline = 'in 2 days';
    }
  }
  
  return response;
}

/**
 * Calculate deadline timestamp from enum value
 */
function calculateDeadlineISO(deadlineType: string): string {
  const now = new Date();
  let deadlineDate: Date;
  
  switch (deadlineType) {
    case 'tomorrow':
      deadlineDate = new Date(now.getTime() + 24 * 60 * 60 * 1000);
      break;
    case 'in 2 days':
      deadlineDate = new Date(now.getTime() + 2 * 24 * 60 * 60 * 1000);
      break;
    case 'next week':
      deadlineDate = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);
      break;
    case 'next month':
      deadlineDate = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000);
      break;
    default:
      deadlineDate = new Date(now.getTime() + 2 * 24 * 60 * 60 * 1000); // Default to 2 days
  }
  
  return deadlineDate.toISOString();
}

/**
 * Main Commitment Detection API Route
 */
export async function POST(request: NextRequest) {
  try {
    // Authentication check
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json(
        { success: false, error: 'User not authenticated' },
        { status: 401 }
      );
    }

    // Environment checks
    if (!process.env.OPENROUTER_API_KEY) {
      return NextResponse.json(
        { success: false, error: 'OpenRouter API key not configured' },
        { status: 500 }
      );
    }

    // Parse and validate request
    const body = await request.json();
    const validatedRequest = validateRequest(body);

    // Skip analysis if conversation is too short or empty
    if (!validatedRequest.conversationHistory || validatedRequest.conversationHistory.length < 2) {
      return NextResponse.json({
        success: true,
        commitmentDetected: false,
        commitment: null
      });
    }

    // Query existing commitments for this session to provide LLM context
    const existingCommitments = await queryExistingCommitments(validatedRequest.sessionId, userId);

    // Initialize OpenRouter client
    const openrouter = new OpenAI({
      baseURL: 'https://openrouter.ai/api/v1',
      apiKey: process.env.OPENROUTER_API_KEY,
      defaultHeaders: {
        'X-Title': 'Reflecta Commitment Detection',
      },
    });

    // Initialize Langfuse client
    const langfuse = new Langfuse();

    // Generate analysis prompt with existing commitments context
    const analysisPrompt = generateAnalysisPrompt(
      validatedRequest.conversationHistory, 
      existingCommitments
    );

    const messages = [
      { role: 'system' as const, content: getSystemPrompt() },
      { role: 'user' as const, content: analysisPrompt }
    ];

    // Create Langfuse trace & generation (if configured)
    const trace = langfuse?.trace({
      name: 'commitment-detection',
      userId,
      sessionId: validatedRequest.sessionId,
      metadata: {
        route: '/api/coaching/commitments',
        existingCommitmentsCount: existingCommitments.length,
      },
    });

    const generation = trace?.generation({
      name: 'commitment-analysis',
      model: 'anthropic/claude-3.5-haiku',
      input: messages,
      metadata: {
        provider: 'openrouter',
        streaming: false,
      },
    });

    // Call cost-efficient model for detection
    const response = await openrouter.chat.completions.create({
      model: 'anthropic/claude-3.5-haiku', // Cost-efficient model
      messages,
      temperature: 0.2, // Low temperature for consistent detection
      max_tokens: 800, // Sufficient for structured response
    });

    const aiResponse = response.choices[0]?.message?.content;
    if (!aiResponse) {
      throw new Error('No response from AI model');
    }

    // Parse and validate the response
    let detectionResult: LLMCommitmentDetectionResponse;
    try {
      const parsedResponse = tryParseJsonOrRepair(aiResponse);
      const transformedResponse = transformLLMResponse(parsedResponse as Record<string, unknown>);
      detectionResult = CommitmentDetectionResponseSchema.parse(transformedResponse);
      
      // End Langfuse generation & trace, flush in background
      generation?.end({
        output: detectionResult,
      });

      trace?.update({
        input: messages,
        output: detectionResult,
      });

      waitUntil(langfuse.flushAsync());
      
      // If commitment detected, save immediately to Firestore
      if (detectionResult.commitmentDetected && detectionResult.commitment) {
        const savedCommitment = await saveCommitmentToFirestore(
          detectionResult.commitment,
          detectionResult.confidence,
          detectionResult.reasoning,
          validatedRequest.sessionId,
          userId
        );
        
        return NextResponse.json({
          success: true,
          commitmentDetected: true,
          commitment: savedCommitment
        });
      } else {
        return NextResponse.json({
          success: true,
          commitmentDetected: false,
          commitment: null
        });
      }

    } catch (parseError) {
      console.error('Failed to parse commitment detection response:', parseError);
      console.error('Raw AI response:', aiResponse);
      
      // End Langfuse generation with error, flush in background
      generation?.end({
        output: { error: 'Parsing failed', rawResponse: aiResponse },
      });

      trace?.update({
        input: messages,
        output: { error: 'Parsing failed' },
      });

      waitUntil(langfuse.flushAsync());
      
      // Fallback response
      return NextResponse.json({
        success: true,
        commitmentDetected: false,
        commitment: null,
        error: "Analysis parsing failed, unable to detect commitments reliably"
      });
    }

  } catch (error) {
    console.error('Commitment detection API error:', error);
    
    return NextResponse.json({
      success: false,
      error: 'Commitment detection failed',
      commitmentDetected: false,
      commitment: null
    }, { status: 500 });
  }
}

/**
 * Validate commitment detection request
 */
function validateRequest(body: unknown): CommitmentDetectionRequest {
  if (!body || typeof body !== 'object') {
    throw new Error('Invalid request body');
  }

  const bodyObj = body as Record<string, unknown>;

  if (!Array.isArray(bodyObj.conversationHistory)) {
    throw new Error('Invalid or missing conversationHistory');
  }

  if (typeof bodyObj.sessionId !== 'string' || !bodyObj.sessionId.trim()) {
    throw new Error('Invalid or missing sessionId');
  }

  // Validate conversation history structure
  const conversationHistory = bodyObj.conversationHistory.map((msg: { id: string; role: 'user' | 'assistant'; content: string; timestamp: string }) => ({
    id: msg.id,
    role: msg.role,
    content: msg.content,
    timestamp: new Date(msg.timestamp)
  }));

  return {
    conversationHistory,
    sessionId: bodyObj.sessionId as string
  };
}

/**
 * Generate system prompt for commitment detection
 */
function getSystemPrompt(): string {
  return `You are an AI assistant specialized in detecting actionable commitments from coaching conversations.

Your task is to analyze coaching session transcripts and identify when users make genuine commitments to specific actions they plan to take.

Your primary goal is to catch actionable commitments that help users move from coaching to action. When in doubt, lean toward detection rather than missing potential commitments.

IMPORTANT: Be mindful of existing commitments from this session. Do not re-suggest commitments that have already been detected by the user.

## What Qualifies as a Commitment:

**YES - These are commitments:**
- "I'll email my top 5 users by Friday"
- "I'm going to write the first draft this week"  
- "Tomorrow I'll have that difficult conversation with my co-founder"
- "I'll block out 2 hours each morning for deep work"
- "I'm going to reach out to three potential advisors this month"
- "Yes, I'll try that experiment" (agreement to coach suggestion)
- "That sounds good, I'll do that" (agreement to specific action)
- "Okay, let me commit to that approach" (explicit agreement)
- "I agree, I'll work on that tomorrow" (clear acceptance)
- "Sure, I can do that" (casual agreement)
- "Alright, I'll give it a shot" (informal commitment)
- "Let me work on that" (taking on a task)
- "I'll focus on that next" (prioritizing action)

**NO - These are NOT commitments:**
- Vague intentions: "I should probably exercise more"
- Uncertain responses: "Maybe I could try that"
- Questions: "Should I email them?"
- General reflections: "I've been thinking about..."
- Past actions: "I already sent the email"
- Conditional statements: "If I have time, I might..."

## Detection Criteria:

1. **Specificity**: Action is concrete and specific
2. **Ownership**: User shows intent to act OR agrees to suggestions ("I will", "I'm going to", "Yes", "Sure", "Let me", "I can")
3. **Timeframe**: Explicit or implicit deadline/timeframe  
4. **Actionability**: Can be completed and verified
5. **Forward-looking**: Refers to future action, not past reflection
6. **Agreement**: Clear acceptance of coach-suggested experiments or actions

IMPORTANT: Use these exact values: "tomorrow", "in 2 days", "next week", "next month"

## Response Format:
Return ONLY valid JSON with this exact structure. Do not include any text before or after the JSON:

{
  "thinking": "string (analyze the conversation for new commitments, check against existing ones if any, decide whether to detect)",
  "commitmentDetected": boolean,
  "commitment": {
    "title": "string (5-200 chars, clear action statement)",
    "suggestedDeadline": "enum from deadline options",
  } OR null if no commitment,
  "confidence": number (0-100, how certain you are),
  "reasoning": "string (explain your decision in 1-2 sentences)"
}

IMPORTANT: Your response must be ONLY the JSON object above. No additional text, explanations, or analysis outside the JSON.

Be thorough in detecting commitments - when the user shows clear intent to take action or agrees to coach suggestions, detect it as a commitment. It's better to catch actionable commitments than to miss them.`;
}

/**
 * Query existing commitments for a session to provide LLM context
 */
async function queryExistingCommitments(sessionId: string, userId: string): Promise<Commitment[]> {
  try {
    const db = FirestoreAdminService.getAdminDatabase();
    const commitmentsRef = db.collection('commitments');
    
    const querySnapshot = await commitmentsRef
      .where('coachingSessionId', '==', sessionId)
      .where('userId', '==', userId)
      .orderBy('detectedAt', 'desc')
      .get();
    
    const commitments: Commitment[] = [];
    querySnapshot.forEach(doc => {
      const data = doc.data();
      commitments.push({
        id: doc.id,
        ...data,
        // Convert Firestore timestamps to Date objects
        commitmentDueAt: data.commitmentDueAt.toDate(),
        detectedAt: data.detectedAt.toDate(),
        acceptedAt: data.acceptedAt?.toDate(),
        dismissedAt: data.dismissedAt?.toDate()
      } as Commitment);
    });

    return commitments;
  } catch (error) {
    console.error('Error querying existing commitments:', error);
    return []; // Return empty array on error to not block detection
  }
}

/**
 * Save detected commitment to Firestore commitments collection
 */
async function saveCommitmentToFirestore(
  llmCommitment: { title: string; suggestedDeadline: string },
  confidence: number,
  reasoning: string,
  sessionId: string,
  userId: string
): Promise<Commitment> {
  try {
    const db = FirestoreAdminService.getAdminDatabase();
    const now = new Date();
    const deadlineISO = calculateDeadlineISO(llmCommitment.suggestedDeadline);
    
    const commitmentData: Omit<Commitment, 'id'> = {
      userId,
      coachingSessionId: sessionId,
      title: llmCommitment.title,
      suggestedDeadline: llmCommitment.suggestedDeadline as CommitmentDeadline,
      commitmentDueAt: new Date(deadlineISO),
      status: 'detected',
      confidence,
      reasoning,
      detectedAt: now
    };
    
    // Add commitment to Firestore
    const docRef = await db.collection('commitments').add(commitmentData);
    
    return {
      id: docRef.id,
      ...commitmentData
    };
  } catch (error) {
    console.error('Error saving commitment to Firestore:', error);
    throw error;
  }
}

/**
 * Generate analysis prompt from conversation history
 */
function generateAnalysisPrompt(conversationHistory: CoachingMessage[], existingCommitments: Commitment[]): string {
  // Focus on recent messages - commitments usually happen in latest exchanges
  const recentMessages = conversationHistory.slice(-10);
  
  const transcript = recentMessages
    .map(msg => `${msg.role.toUpperCase()}: ${msg.content}`)
    .join('\n\n');

  // Build existing commitments context - simplified
  let existingCommitmentsContext = '';
  if (existingCommitments.length > 0) {
    const commitmentsList = existingCommitments
      .map(c => `- ${c.title}`)
      .join('\n');
    
    existingCommitmentsContext = `

EXISTING COMMITMENTS ALREADY DETECTED:
${commitmentsList}

IMPORTANT: Do NOT re-detect these existing commitments. Only detect NEW commitments that are clearly different from the ones listed above.`;
  }

  return `Analyze this coaching conversation transcript for actionable commitments made by the user.

Focus on the user's statements to identify specific actions they've committed to taking, with concrete timeframes.${existingCommitmentsContext}

Conversation Transcript:
${transcript}

Analyze the conversation and respond with the commitment detection JSON structure.`;
}
