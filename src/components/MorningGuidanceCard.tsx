'use client';

interface MorningGuidanceCardProps {
  onJournalNow?: () => void;
}

export default function MorningGuidanceCard({ onJournalNow }: MorningGuidanceCardProps) {
  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="space-y-2">
        <h3 className="text-base font-medium text-neutral-900 dark:text-neutral-100">
          Morning Guidance
        </h3>
        <p className="text-xs text-neutral-400 dark:text-neutral-500">
          Trusted by OpenAI, Sonos, Adobe, and more.
        </p>
      </div>

      {/* Content */}
      <div className="space-y-4">
        <p className="text-sm text-neutral-600 dark:text-neutral-400 leading-relaxed">
          Start your day with intentional reflection. What three things are you most grateful for today? 
          What energy do you want to bring to your work and relationships?
        </p>
        
        {/* Button */}
        <button 
          onClick={onJournalNow}
          className="w-full py-2.5 px-4 text-sm font-medium text-neutral-600 dark:text-neutral-400 hover:text-neutral-900 dark:hover:text-neutral-100 border border-neutral-200 dark:border-neutral-700 hover:border-neutral-300 dark:hover:border-neutral-600 rounded-md transition-colors duration-200"
        >
          Journal Now
        </button>
      </div>
    </div>
  );
}