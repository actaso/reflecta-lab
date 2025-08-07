import { UserAccount } from '@/types/journal';

/**
 * Generates default values for a new UserAccount
 * This ensures consistency across client-side and server-side user creation
 */
export function generateDefaultUserAccount(userId: string, email: string = ''): UserAccount {
  // Try to detect user's timezone, fallback to America/New_York
  const detectedTimezone = (() => {
    try {
      return Intl.DateTimeFormat().resolvedOptions().timeZone;
    } catch {
      return 'America/New_York';
    }
  })();

  const now = new Date();

  // Calculate initial coaching message time (1-13 hours from now for multipleTimesPerWeek)
  // This matches the bootstrap logic in the scheduler
  const bootstrapHours = Math.random() * 12 + 1; // 1-13 hours
  const initialCoachingDue = now.getTime() + (bootstrapHours * 60 * 60 * 1000);

  return {
    uid: userId,
    email: email,
    createdAt: now,
    updatedAt: now,
    firstName: '',
    onboardingAnswers: {
      onboardingCompleted: false,
      onboardingCompletedAt: 0,
      whatDoYouDoInLife: [],
      selfReflectionPracticesTried: [],
      clarityInLife: 0,
      stressInLife: 0,
    },
    coachingConfig: {
      challengeDegree: 'moderate',
      harshToneDegree: 'supportive',
      coachingMessageFrequency: 'multipleTimesPerWeek',
      enableCoachingMessages: true, // Enabled by default
      lastCoachingMessageSentAt: 0,
      coachingMessageTimePreference: 'morning',
    },
    mobilePushNotifications: {
      enabled: false, // Disabled by default for privacy
      expoPushTokens: [],
      lastNotificationSentAt: 0,
    },
    userTimezone: detectedTimezone,
    nextCoachingMessageDue: initialCoachingDue, // Set initial timestamp so user is immediately eligible
  };
}

/**
 * Default values for missing fields when reading existing user documents
 * Used for backward compatibility with documents that might be missing newer fields
 */
export const DEFAULT_USER_ACCOUNT_FIELDS = {
  email: '',
  firstName: '',
  onboardingAnswers: {
    onboardingCompleted: false,
    onboardingCompletedAt: 0,
    whatDoYouDoInLife: [],
    selfReflectionPracticesTried: [],
    clarityInLife: 0,
    stressInLife: 0,
  },
  coachingConfig: {
    challengeDegree: 'moderate' as const,
    harshToneDegree: 'supportive' as const,
    coachingMessageFrequency: 'multipleTimesPerWeek' as const,
    enableCoachingMessages: true,
    lastCoachingMessageSentAt: 0,
    coachingMessageTimePreference: 'morning' as const,
  },
  mobilePushNotifications: {
    enabled: false,
    expoPushTokens: [],
    lastNotificationSentAt: 0,
  },
  userTimezone: 'America/New_York', // Safe fallback for existing documents
  nextCoachingMessageDue: undefined,
} as const;