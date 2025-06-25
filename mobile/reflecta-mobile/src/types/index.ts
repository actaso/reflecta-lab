export interface JournalEntry {
  id: string;
  timestamp: Date;
  content: string;
}

export type EntriesByDate = Record<string, JournalEntry[]>;