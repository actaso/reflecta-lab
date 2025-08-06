// collection name on firestore: "entries"
export type JournalEntry = {
  id: string;
  timestamp: Date; // created at
  content: string;
  uid: string; // user id from firebase auth & clerk (should be the same)
  lastUpdated: Date; // last time a change happened to this entry
  images?: ImageMetadata[]; // metadata of images contained in this entry
};

// Image metadata stored with journal entries
export type ImageMetadata = {
  filename: string; // filename in Firebase Storage
  url: string; // Firebase Storage download URL
  size: number; // file size in bytes
  type: string; // MIME type
  uploadedAt: Date; // when image was uploaded
};

// Leadership Pulse Entry - collection name on firestore: "pulseEntries"
export type PulseEntry = {
  id: string;
  uid: string; // user id from firebase auth & clerk
  date: string; // YYYY-MM-DD format for daily tracking
  timestamp: Date; // when pulse was completed
  
  // Raw survey responses
  moodPA: number; // Mood Positive Affect (0-10): "How enthusiastic are you feeling?"
  moodNA: number; // Mood Negative Affect (0-10): "How distressed are you feeling?"
  stress1: number; // Stress item 1 (0-4): "How overwhelmed do you feel?"
  stress2: number; // Stress item 2 (0-4): "How unable to control important things do you feel?"
  selfEfficacy: number; // Self-efficacy (0-10): "How confident are you to handle today's challenges?"
  
  // Computed normalized scores (0-100)
  computedScores: {
    mood: number; // Combined mood score
    stress: number; // Combined stress score  
    selfEfficacy: number; // Self-efficacy score
  };
};

// Pulse question definitions
export type PulseQuestion = {
  id: string;
  category: 'mood' | 'stress' | 'selfEfficacy';
  question: string;
  scale: {
    min: number;
    max: number;
    labels?: { value: number; label: string }[];
  };
};

// Tips for low scores
export type PulseTip = {
  category: 'mood' | 'stress' | 'selfEfficacy';
  threshold: number; // Show tip if score is below this
  title: string;
  description: string;
  actionable: string;
};

// collection name on firestore: "users"
export type UserAccount = {
  uid: string;
  createdAt: Date;
  updatedAt: Date;
  firstName: string;
  onboardingAnswers: {
      onboardingCompleted: boolean;
      onboardingCompletedAt: number; // unix timestamp
      whatDoYouDoInLife: string[]; // string of tags selected
      selfReflectionPracticesTried: string[]; // string of tags selected
      clarityInLife: number; // 0 being totally unclear, 10 being very clear
      stressInLife: number; // 0 being totally not stressed, 10 being very stressed
  }
  coachingConfig: {
      challengeDegree: 'gentle' | 'moderate' | 'challenging' | 'intense';
      harshToneDegree: 'supportive' | 'direct' | 'firm' | 'harsh';
      coachingMessageFrequency: 'daily' | 'multipleTimesPerWeek' | 'onceAWeek';
      enableCoachingMessages: boolean; // if true, based on frequency messages will be sent. this should be a setting in the user doc.
      lastCoachingMessageSentAt: number; // unix timestamp
      coachingMessageTimePreference: 'morning' | 'afternoon' | 'evening';
  }
  mobilePushNotifications: {
    enabled: boolean;
    expoPushTokens: string[]; // array of expo tokens
    lastNotificationSentAt: number; // unix timestamp
  }
  userTimezone: string; // timezone of the user (e.g. "America/New_York")
  nextCoachingMessageDue?: number; // unix timestamp when next coaching message should be sent
};
