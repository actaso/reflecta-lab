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

export type CoachingContext = {
  entryId: string;
  entryContent: string;
  userAlignment: string;
  recentEntries: JournalEntry[];
  formattedRecentEntries: string;
  userId: string;
};