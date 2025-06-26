'use client';

import { formatDisplayDate, formatTime } from '../utils/formatters';

// Conditional imports to handle test environment
const hasClerkKeys = process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY;

// Define the shape of Clerk components we need
interface ClerkComponentsType {
  useUser: () => { isSignedIn: boolean };
  SignInButton: React.ComponentType<{ mode: string; children: React.ReactNode }>;
  UserButton: React.ComponentType<{ appearance?: object }>;
}

let ClerkComponents: ClerkComponentsType | null = null;

if (hasClerkKeys) {
  try {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    ClerkComponents = require('@clerk/nextjs') as ClerkComponentsType;
  } catch {
    // Clerk not available in test environment
    ClerkComponents = null;
  }
}

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

// Component that uses Clerk hooks when available
function ClerkAuthSection() {
  if (!ClerkComponents) return null;
  
  try {
    // eslint-disable-next-line react-hooks/rules-of-hooks
    const { isSignedIn } = ClerkComponents.useUser();
    
    if (isSignedIn) {
      return (
        <ClerkComponents.UserButton 
          appearance={{
            elements: {
              avatarBox: "w-8 h-8",
              userButtonPopoverCard: "bg-white dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700"
            }
          }}
        />
      );
    }

    return (
      <ClerkComponents.SignInButton mode="modal">
        <button
          className="w-8 h-8 rounded-full bg-neutral-200 dark:bg-neutral-700 text-neutral-500 dark:text-neutral-400 flex items-center justify-center hover:bg-neutral-300 dark:hover:bg-neutral-600 transition-colors"
          title="Sign in to sync your journal"
          aria-label="Sign in"
        >
          <svg
            width="16"
            height="16"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.5"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/>
            <circle cx="12" cy="7" r="4"/>
          </svg>
        </button>
      </ClerkComponents.SignInButton>
    );
  } catch {
    return null;
  }
}

// Fallback auth button for when Clerk is not configured
function FallbackAuthButton() {
  return (
    <button
      className="w-8 h-8 rounded-full bg-neutral-200 dark:bg-neutral-700 text-neutral-300 dark:text-neutral-600 flex items-center justify-center cursor-not-allowed"
      title="Authentication not configured"
      aria-label="Authentication not configured"
      disabled
    >
      <svg
        width="16"
        height="16"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/>
        <circle cx="12" cy="7" r="4"/>
      </svg>
    </button>
  );
}

// Main auth section component
function AuthSection() {
  if (!hasClerkKeys || !ClerkComponents) {
    return <FallbackAuthButton />;
  }
  
  return <ClerkAuthSection />;
}

export default function EntryHeader({ currentEntry, onDeleteEntry, onShowHelp }: EntryHeaderProps) {
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
      
      <div className="flex items-center gap-2">
        {/* Authentication - conditional rendering based on Clerk setup and sign-in status */}
        <AuthSection />

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