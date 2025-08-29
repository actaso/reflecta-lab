/**
 * Type definitions for commitment detection and management
 * 
 * Architecture: Single source of truth in 'commitments' Firestore collection
 * - Detection API immediately saves commitments with status 'detected'
 * - Update API changes status to 'accepted' or 'dismissed'
 * - No dual state management (removed from coaching sessions)
 */

// Define CommitmentDeadline enum here for shared use
export enum CommitmentDeadline {
  TOMORROW = "tomorrow",
  IN_2_DAYS = "in 2 days", 
  NEXT_WEEK = "next week",
  NEXT_MONTH = "next month"
}

export type CommitmentStatus = 'detected' | 'accepted' | 'dismissed';

/**
 * Commitment document stored in Firestore 'commitments' collection
 * This is the single source of truth for all commitment data
 */
export interface Commitment {
  id: string; // Firestore document ID
  userId: string; // Clerk user ID
  coachingSessionId: string; // Reference to coaching session
  title: string;
  suggestedDeadline: CommitmentDeadline;
  commitmentDueAt: Date; // When the commitment is due (calculated)
  status: CommitmentStatus;
  confidence: number; // LLM confidence score (0-100)
  reasoning: string; // LLM reasoning for detection
  detectedAt: Date; // When commitment was first detected
  acceptedAt?: Date; // When user accepted the commitment
  dismissedAt?: Date; // When user dismissed the commitment
}

/**
 * Request for commitment detection API
 */
export interface CommitmentDetectionRequest {
  conversationHistory: Array<{
    id: string;
    role: 'user' | 'assistant';
    content: string;
    timestamp: Date;
  }>;
  sessionId: string; // Required for context queries
}

/**
 * Response from commitment detection API
 */
export interface CommitmentDetectionResponse {
  success: boolean;
  commitmentDetected: boolean;
  commitment: Commitment | null; // Full commitment document if detected
  error?: string;
}

/**
 * Request for commitment status update API
 */
export interface CommitmentUpdateRequest {
  status: 'accepted' | 'dismissed';
  title?: string; // Allow title updates on acceptance
  selectedDeadline?: CommitmentDeadline; // Allow deadline changes on acceptance
}

/**
 * Response from commitment update API
 */
export interface CommitmentUpdateResponse {
  success: boolean;
  commitment: Commitment;
  error?: string;
}
