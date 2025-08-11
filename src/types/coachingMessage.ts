// collection name on firestore: "coachingMessages"
export type CoachingMessage = {
  id: string; // Firestore document ID
  uid: string;
  createdAt: number; // unix timestamp
  updatedAt: number; // unix timestamp
  
  // Message Content
  messageContent: string; // The actual coaching message text
  messageType: string; // The recommended message type (check_in, encouragement, etc.)
  pushNotificationText: string; // Short notification text
  
  // Quality Assessment
  effectivenessRating: number; // 1-10 rating from outcome simulation
  recommendedAction: 'SEND_MESSAGE' | 'SKIP_MESSAGE' | 'REVISE_MESSAGE'; // LLM recommendation
  
  // Delivery Status
  wasSent: boolean; // Whether message was actually sent to user
  journalEntryId?: string; // If sent, the ID of the created journal entry
  
  // Context & Debugging
  contextUsed: string; // The full context sent to LLM for generation
  generationAttempt: number; // Attempt number (for retries)
  failureReason?: string; // If failed, the reason why
  
  // Timing Info
  userTimezone: string; // User's timezone when message was generated
  userTimePreference: 'morning' | 'afternoon' | 'evening'; // User's preferred time
  scheduledFor?: number; // Unix timestamp when message was originally scheduled
};
  