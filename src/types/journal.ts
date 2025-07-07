// collection name on firestore: "entries"
export type JournalEntry = {
  id: string;
  timestamp: Date; // created at
  content: string;
  uid: string; // user id from firebase auth & clerk (should be the same)
  lastUpdated: Date; // last time a change happened to this entry
};

/**
 * Morning guidance data generated daily for users
 */
export type MorningGuidance = {
  journalQuestion: string; // The main question to display
  detailedMorningPrompt: string; // Extended/detailed version of the question
  reasoning: string; // Why this question was chosen
  generatedAt: Date; // When this guidance was generated
};

// collection name on firestore: "users"
export type UserAccount = {
  uid: string;
  lastMorningGuidanceGenerated?: Date;
  currentMorningGuidance?: MorningGuidance; // Today's morning guidance
  alignment?: string; // User's biggest priority in life right now
  createdAt: Date;
  updatedAt: Date;
};