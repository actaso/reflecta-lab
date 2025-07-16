import { CoachingInteractionRequest, CoachingContext } from '@/types/coaching';
import { FirestoreAdminService } from '@/services/firestoreAdminService';

/**
 * Coaching Context Builder
 * Builds comprehensive context for coaching interactions
 * 
 * This is coaching-specific business logic that combines user data
 * with request data to create context for AI coaching prompts.
 */
export class CoachingContextBuilder {
  /**
   * Build coaching context from request and user data
   */
  static async buildContext(request: CoachingInteractionRequest, userId: string): Promise<CoachingContext> {
    const userAccount = await FirestoreAdminService.getUserAccount(userId);
    const alignment = userAccount?.alignment || "Not specified";
    
    const recentEntries = await FirestoreAdminService.getRecentJournalEntries(userId, 10);
    
    return {
      entryId: request.entryId,
      entryContent: request.entryContent,
      userAlignment: alignment,
      recentEntries,
      userId
    };
  }
}