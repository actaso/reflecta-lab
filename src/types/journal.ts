// collection name on firestore: "entries"
export type JournalEntry = {
  id: string;
  timestamp: Date; // created at
  content: string;
  uid: string; // user id from firebase auth & clerk (should be the same)
  lastUpdated: Date; // last time a change happened to this entry
};

// collection name on firestore: "users"
export type UserAccount = {
  uid: string;
  lastMorningGuidanceGenerated?: Date;
  createdAt: Date;
  updatedAt: Date;
};