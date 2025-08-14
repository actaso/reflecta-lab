'use client';

import { MessageCircle, Loader2 } from 'lucide-react';

interface CoachingSessionCardProps {
  title?: string;
  messageCount?: number;
  sessionType?: string;
  onOpenConversation?: () => void;
  loading?: boolean;
}

export default function CoachingSessionCard({ 
  title = "Goal breakout session",
  messageCount = 0,
  sessionType = "Coach chat",
  onOpenConversation,
  loading = false
}: CoachingSessionCardProps) {
  return (
    <div className="w-full bg-white dark:bg-neutral-800 rounded-xl border border-neutral-200 dark:border-neutral-700 p-4 shadow-sm hover:shadow-md transition-shadow duration-200 mb-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 sm:gap-4">
        <div className="flex items-start gap-3 flex-1 min-w-0">
          {/* Chat bubble icon */}
          <div className="flex-shrink-0 mt-1">
            <div className="w-8 h-8 bg-blue-100 dark:bg-blue-900/30 rounded-lg flex items-center justify-center">
              {loading ? (
                <Loader2 className="w-4 h-4 text-blue-600 dark:text-blue-400 animate-spin" />
              ) : (
                <MessageCircle className="w-4 h-4 text-blue-600 dark:text-blue-400" />
              )}
            </div>
          </div>
          
          {/* Content */}
          <div className="flex-1 min-w-0">
            <h3 className="text-lg font-semibold text-neutral-900 dark:text-neutral-100 mb-1 break-words">
              {loading ? (
                <div className="h-5 bg-neutral-200 dark:bg-neutral-700 rounded animate-pulse w-48"></div>
              ) : (
                title
              )}
            </h3>
            <p className="text-sm text-neutral-500 dark:text-neutral-400 break-words">
              {loading ? (
                <span className="inline-block h-4 bg-neutral-200 dark:bg-neutral-700 rounded animate-pulse w-32"></span>
              ) : (
                `${sessionType} • ${messageCount} messages`
              )}
            </p>
          </div>
        </div>
        
        {/* Button */}
        <div className="flex-shrink-0 w-full sm:w-auto">
          <button
            onClick={onOpenConversation}
            disabled={loading}
            className="w-full sm:w-auto px-4 py-2.5 bg-neutral-100 dark:bg-neutral-700 text-neutral-700 dark:text-neutral-200 rounded-lg text-sm font-medium hover:bg-neutral-200 dark:hover:bg-neutral-600 transition-colors duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {loading ? 'Loading...' : 'Open Conversation'}
          </button>
        </div>
      </div>
    </div>
  );
}