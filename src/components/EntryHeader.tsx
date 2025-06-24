'use client';

import { formatDisplayDate, formatTime } from '../utils/formatters';

type JournalEntry = {
  id: string;
  timestamp: Date;
  content: string;
};

interface EntryHeaderProps {
  currentEntry: { entry: JournalEntry; dateKey: string } | null;
  onDeleteEntry: (entryId: string) => void;
  onShowHelp: () => void;
}

export default function EntryHeader({ currentEntry, onDeleteEntry, onShowHelp }: EntryHeaderProps) {
  const hasClerkKeys = process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY;

  return (
    <div className="pt-8 px-8 pb-4 flex items-center justify-between flex-shrink-0">
      <div className="flex items-center">
        <h1 className="text-base text-black dark:text-white font-normal">
          {currentEntry ? formatDisplayDate(new Date(currentEntry.dateKey)) : 'Select an entry'}
        </h1>
        <div className="ml-3 w-6 h-[2px] bg-orange-500"></div>
        {currentEntry && (
          <div className="ml-4 text-sm text-neutral-500 dark:text-neutral-400">
            {formatTime(currentEntry.entry.timestamp)}
          </div>
        )}
        {/* Delete button next to title */}
        {currentEntry && (
          <button
            onClick={() => onDeleteEntry(currentEntry.entry.id)}
            className="ml-4 w-6 h-6 text-neutral-300 hover:text-neutral-500 dark:text-neutral-600 dark:hover:text-neutral-400 flex items-center justify-center text-sm transition-colors"
            title="Delete entry"
          >
            ×
          </button>
        )}
      </div>
      
      <div className="flex items-center space-x-2">
        {/* Authentication Button - always show, works when Clerk is configured */}
        <button
          className="px-3 py-1.5 text-sm bg-neutral-200 dark:bg-neutral-700 text-neutral-600 dark:text-neutral-300 rounded-md hover:bg-neutral-300 dark:hover:bg-neutral-600 transition-colors"
          title={hasClerkKeys ? "Sign in to sync your journal" : "Authentication not configured"}
          aria-label="Sign in"
          onClick={() => {
            if (hasClerkKeys) {
              console.log('Sign in clicked - would open Clerk modal');
            } else {
              console.log('Sign in clicked - Clerk not configured');
            }
          }}
        >
          signin
        </button>
        
        {/* ? Button for help */}
        <button
          onClick={onShowHelp}
          className="w-8 h-8 rounded-full bg-neutral-200 dark:bg-neutral-700 text-neutral-600 dark:text-neutral-300 flex items-center justify-center hover:bg-neutral-300 dark:hover:bg-neutral-600 transition-colors"
          title="Show shortcuts"
          aria-label="Show shortcuts"
        >
          <span className="text-lg leading-none">?</span>
        </button>
      </div>
    </div>
  );
}
