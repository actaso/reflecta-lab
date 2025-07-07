'use client';

import { formatDisplayDate, formatTime } from '../utils/formatters';
import { SignInButton, UserButton, SignedIn, SignedOut } from '@clerk/nextjs';
import { JournalEntry } from '../types/journal';
import { DarkModeToggle } from './DarkModeToggle';

// Environment check
const hasClerkKeys = !!process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY;

interface EntryHeaderProps {
  currentEntry: { entry: JournalEntry; dateKey: string } | null;
  onDeleteEntry: (entryId: string) => void;
}

// Component that uses Clerk's conditional rendering components
function ClerkAuthSection() {
  return (
    <>
      <SignedOut>
        <SignInButton mode="modal">
          <button
            className="w-8 h-8 rounded-full bg-neutral-200 dark:bg-neutral-700 text-neutral-600 dark:text-neutral-300 flex items-center justify-center hover:bg-neutral-300 dark:hover:bg-neutral-600 transition-colors"
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
        </SignInButton>
      </SignedOut>
      
      <SignedIn>
        <UserButton 
          appearance={{
            elements: {
              avatarBox: "w-8 h-8",
              userButtonPopoverCard: "bg-white dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700"
            }
          }}
        />
      </SignedIn>
    </>
  );
}

// Fallback auth button for when Clerk is not configured  
function FallbackAuthButton() {
  return (
    <button
      className="w-8 h-8 rounded-full bg-neutral-200 dark:bg-neutral-700 text-neutral-400 dark:text-neutral-500 flex items-center justify-center cursor-not-allowed opacity-50"
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
  // Always render something - either Clerk auth or fallback
  if (hasClerkKeys) {
    return <ClerkAuthSection />;
  }
  
  // Fallback for when Clerk is not configured
  return <FallbackAuthButton />;
}

export default function EntryHeader({ currentEntry, onDeleteEntry }: EntryHeaderProps) {
  return (
    <div className="pt-8 pb-4 flex items-center justify-between flex-shrink-0">
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
      
      <div className="flex items-center gap-3">
        <DarkModeToggle />
        {/* Authentication - conditional rendering based on Clerk setup and sign-in status */}
        <AuthSection />
      </div>
    </div>
  );
}