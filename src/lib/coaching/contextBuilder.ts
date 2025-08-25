import { CoachingInteractionRequest, CoachingContext } from '@/types/coaching';
import { FirestoreAdminService } from '@/services/firestoreAdminService';
import { JournalEntry, UserAccount } from '@/types/journal';

/**
 * Coaching Context Builder Service
 * 
 * OVERVIEW:
 * This service builds comprehensive context for coaching interactions by combining:
 * - User's recent journal entries
 * - User account data (onboarding answers, coaching preferences)
 * - Session-specific information
 * 
 * PURPOSE:
 * The coaching context is reused across multiple coaching features:
 * - Real-time coaching chat sessions
 * - Progress evaluation
 * - Session summaries and insights
 * - Personalized coaching recommendations
 * 
 * ARCHITECTURE:
 * This is kept as a service (not route-specific) because the context building
 * logic is shared across multiple coaching endpoints and can be extended
 * for future coaching features.
 * 
 * USAGE:
 * - Call buildContext() for general coaching interactions
 * - Call buildChatContext() for streaming chat sessions (includes user prefs)
 * - Call buildUserProfile() for user-specific coaching configuration
 */
export class CoachingContextBuilder {
  /**
   * Build comprehensive coaching context for chat sessions
   * Includes user preferences, onboarding data, and recent entries
   */
  static async buildChatContext(userId: string): Promise<{
    userProfile: UserAccount | null;
    recentEntries: JournalEntry[];
    formattedContext: string;
    entryCount: number;
  }> {
    // Get user account data including coaching preferences
    const userProfile = await FirestoreAdminService.getUserAccount(userId);
    
    // Single-pass: get up to 10 non-empty entries and the non-empty count
    const { entries: recentEntries, nonEmptyCount: entryCount } =
      await FirestoreAdminService.getNonEmptyEntriesWithCount(userId, 10);
    
    // Build formatted context string for AI prompts
    const formattedContext = this.buildFormattedContext(userProfile, recentEntries, entryCount);
    
    return {
      userProfile,
      recentEntries,
      formattedContext,
      entryCount
    };
  }

  /**
   * Build coaching context from request and user data (legacy method)
   * @deprecated Use buildChatContext() for new implementations
   */
  static async buildContext(request: CoachingInteractionRequest, userId: string): Promise<CoachingContext> {
    const recentEntries = await FirestoreAdminService.getRecentJournalEntries(userId, 10);
    const formattedRecentEntries = this.formatRecentEntries(recentEntries);
    
    // Get total entry count for routing logic
    const entryCount = await FirestoreAdminService.getUserEntryCount(userId);
    
    return {
      entryId: request.entryId,
      entryContent: request.entryContent,
      recentEntries,
      formattedRecentEntries,
      userId,
      entryCount
    };
  }

  /**
   * Build formatted context string for AI coaching prompts
   */
  private static buildFormattedContext(
    userProfile: UserAccount | null, 
    recentEntries: JournalEntry[], 
    entryCount: number
  ): string {
    let context = '';

    // Add user profile information if available
    if (userProfile) {
      context += this.formatUserProfile(userProfile);
    }

    // Add recent journal entries
    if (recentEntries.length > 0) {
      context += this.formatRecentEntries(recentEntries);
    } else {
      context += '\n\n=== JOURNAL ENTRIES ===\nNo recent entries available.';
    }

    // Add entry count context for coaching strategy
    context += `\n\n=== JOURNALING HISTORY ===\nTotal entries: ${entryCount}`;
    if (entryCount === 0) {
      context += '\nThis user is new to journaling.';
    } else if (entryCount < 5) {
      context += '\nThis user is just getting started with journaling.';
    } else if (entryCount < 20) {
      context += '\nThis user has been journaling regularly.';
    } else {
      context += '\nThis user is an experienced journaler.';
    }

    return context;
  }

  /**
   * Format user profile information for coaching context
   */
  private static formatUserProfile(userProfile: UserAccount): string {
    let profileContext = '\n\n=== USER PROFILE ===\n';
    
    // Add onboarding information if completed
    if (userProfile.onboardingData?.onboardingCompleted) {
      profileContext += `Onboarding completed: ${new Date(userProfile.onboardingData.onboardingCompletedAt).toLocaleDateString()}\n`;
      
      if (userProfile.onboardingData.whatDoYouDoInLife?.length > 0) {
        profileContext += `Life areas: ${userProfile.onboardingData.whatDoYouDoInLife.join(', ')}\n`;
      }
      
      if (userProfile.onboardingData.selfReflectionPracticesTried?.length > 0) {
        profileContext += `Previous reflection practices: ${userProfile.onboardingData.selfReflectionPracticesTried.join(', ')}\n`;
      }
      
      if (typeof userProfile.onboardingData.clarityInLife === 'number') {
        profileContext += `Life clarity level: ${userProfile.onboardingData.clarityInLife}/10\n`;
      }
      
      if (typeof userProfile.onboardingData.stressInLife === 'number') {
        profileContext += `Stress level: ${userProfile.onboardingData.stressInLife}/10\n`;
      }
    }

    // Add coaching preferences
    if (userProfile.coachingConfig) {
      profileContext += `\n--- Coaching Preferences ---\n`;
      profileContext += `Challenge degree: ${userProfile.coachingConfig.challengeDegree}\n`;
      profileContext += `Communication style: ${userProfile.coachingConfig.harshToneDegree}\n`;
    }

    // Add current time and timezone for temporal context
    if (userProfile.userTimezone) {
      const now = new Date();
      const userTime = now.toLocaleString('en-US', {
        timeZone: userProfile.userTimezone,
        weekday: 'long',
        year: 'numeric',
        month: 'long',
        day: 'numeric',
        hour: 'numeric',
        minute: '2-digit',
        hour12: true
      });
      profileContext += `\nCurrent time for user: ${userTime} (${userProfile.userTimezone})`;
    }

    return profileContext;
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