import { CoachingInteractionRequest, CoachingContext } from '@/types/coaching';
import { FirestoreAdminService } from '@/services/firestoreAdminService';
import { JournalEntry } from '@/types/journal';

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
    const formattedRecentEntries = this.formatRecentEntries(recentEntries);
    
    // Get total entry count for routing logic
    const entryCount = await FirestoreAdminService.getUserEntryCount(userId);
    
    return {
      entryId: request.entryId,
      entryContent: request.entryContent,
      userAlignment: alignment,
      recentEntries,
      formattedRecentEntries,
      userId,
      entryCount
    };
  }

  /**
   * Format recent entries in XML-like structure
   */
  private static formatRecentEntries(entries: JournalEntry[]): string {
    if (entries.length === 0) {
      return 'No recent entries available.';
    }

    return entries
      .map((entry, index) => this.formatEntry(entry, index + 1))
      .join('\n\n');
  }

  /**
   * Format a single entry with date calculation
   */
  private static formatEntry(entry: JournalEntry, index: number): string {
    const daysAgo = this.calculateDaysAgo(entry.timestamp);
    const dateString = entry.timestamp.toLocaleDateString('en-US', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });

    return `<entry-${index}>
written on: ${dateString} (${daysAgo})
content: ${entry.content}
</entry-${index}>`;
  }

  /**
   * Calculate how many days ago a date was
   */
  private static calculateDaysAgo(date: Date): string {
    const now = new Date();
    const diffTime = Math.abs(now.getTime() - date.getTime());
    const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));

    if (diffDays === 0) {
      return 'today';
    } else if (diffDays === 1) {
      return '1 day ago';
    } else {
      return `${diffDays} days ago`;
    }
  }
}