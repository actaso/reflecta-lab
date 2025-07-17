import { JournalEntry } from './journal';

/**
 * Coaching interaction request and response types
 */
export type CoachingInteractionRequest = {
  entryId: string;
  entryContent: string;
};

export type CoachingInteractionResponse = {
  success: boolean;
  coachingBlock?: {
    content: string;
    variant: 'text' | 'buttons' | 'multi-select';
    options?: string[];
    reasoning?: string;
  };
  error?: string;
};

/**
 * Extended context for coaching interactions
 */
export type CoachingContext = {
  entryId: string;
  entryContent: string;
  userAlignment: string;
  recentEntries: JournalEntry[];
  formattedRecentEntries: string;
  userId: string;
  entryCount: number; // Add entry count for routing logic
};

/**
 * Model identification and metadata
 */
export type ModelInfo = {
  id: string;
  name: string;
  description: string;
  version: string;
};

/**
 * Base interface for all coaching models
 */
export interface CoachingModel {
  getInfo(): ModelInfo;
  canHandle(context: CoachingContext): boolean;
  generateSystemPrompt(): string;
  generateContextMessage(context: CoachingContext): string;
  processResponse?(response: string): unknown; // Optional response processing
}

/**
 * Model routing decision
 */
export type ModelRoutingDecision = {
  modelId: string;
  reason: string;
  confidence: number; // 0-1 score
};