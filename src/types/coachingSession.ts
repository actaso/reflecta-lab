import { PromptType } from '@/lib/coaching/models/prototypeCoaching/promptLoader';

/**
 * Coaching session message structure
 */
export type CoachingSessionMessage = {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: Date;
};

/**
 * Coaching session document stored in Firestore
 * Collection: 'coachingSessions'
 * Document ID: sessionId (provided by client)
 */
export type CoachingSession = {
  id: string; // Same as document ID
  userId: string; // Clerk user ID
  sessionType: PromptType; // Type of coaching session (default-session | initial-life-deep-dive)
  messages: CoachingSessionMessage[]; // Full conversation history
  createdAt: Date; // When session was first created
  updatedAt: Date; // Last time session was modified
  duration: number; // Session duration in seconds (updatedAt - createdAt)
  wordCount: number; // Total word count of all user messages
};

/**
 * Request payload for prototype coach API
 */
export type PrototypeCoachRequest = {
  message: string;
  sessionId?: string; // Optional session ID for persistence
  sessionType?: PromptType; // Type of session, defaults to 'default-session'
  conversationHistory?: CoachingSessionMessage[]; // Previous messages in conversation
}; 