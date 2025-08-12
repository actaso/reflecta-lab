'use client';

import { useState } from 'react';
import { MessageCircle, ChevronDown, ChevronUp, Loader2 } from 'lucide-react';

interface CoachingMessageCardProps {
  pushText?: string;
  fullMessage?: string;
  messageType?: string;
  loading?: boolean;
}

export default function CoachingMessageCard({ 
  pushText = "Here's your daily coaching reflection...",
  fullMessage = "Today is a perfect opportunity to reflect on your goals and take meaningful action towards what matters most to you.",
  messageType = "daily_reflection",
  loading = false
}: CoachingMessageCardProps) {
  const [expanded, setExpanded] = useState(false);

  const formatMessageType = (type: string) => {
    return type.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
  };

  return (
    <div className="w-full bg-gradient-to-r from-purple-50 to-indigo-50 dark:from-purple-900/20 dark:to-indigo-900/20 rounded-xl border border-purple-200 dark:border-purple-700/50 p-4 shadow-sm hover:shadow-md transition-all duration-200 mb-6 overflow-hidden">
      <div className="flex flex-col gap-3">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            {/* Message icon */}
            <div className="flex-shrink-0">
              <div className="w-8 h-8 bg-purple-100 dark:bg-purple-900/50 rounded-lg flex items-center justify-center">
                {loading ? (
                  <Loader2 className="w-4 h-4 text-purple-600 dark:text-purple-400 animate-spin" />
                ) : (
                  <MessageCircle className="w-4 h-4 text-purple-600 dark:text-purple-400" />
                )}
              </div>
            </div>
            
            {/* Title */}
            <div className="flex-1 min-w-0">
              <h3 className="text-sm font-medium text-purple-800 dark:text-purple-200">
                {loading ? (
                  <span className="inline-block h-4 bg-purple-200 dark:bg-purple-700 rounded animate-pulse w-32"></span>
                ) : (
                  `💭 ${formatMessageType(messageType)}`
                )}
              </h3>
            </div>
          </div>
          
          {/* Expand/Collapse button */}
          {!loading && (
            <button
              onClick={() => setExpanded(!expanded)}
              className="flex-shrink-0 p-1 rounded-lg hover:bg-purple-100 dark:hover:bg-purple-800/50 transition-colors duration-200"
              aria-label={expanded ? 'Collapse message' : 'Expand message'}
            >
              {expanded ? (
                <ChevronUp className="w-4 h-4 text-purple-600 dark:text-purple-400" />
              ) : (
                <ChevronDown className="w-4 h-4 text-purple-600 dark:text-purple-400" />
              )}
            </button>
          )}
        </div>

        {/* Push text (always visible) */}
        <div className="text-sm text-purple-700 dark:text-purple-300 leading-relaxed">
          {loading ? (
            <>
              <span className="inline-block h-4 bg-purple-200 dark:bg-purple-700 rounded animate-pulse w-full mb-2"></span>
              <span className="inline-block h-4 bg-purple-200 dark:bg-purple-700 rounded animate-pulse w-3/4"></span>
            </>
          ) : (
            pushText
          )}
        </div>

        {/* Full message (expandable) */}
        {expanded && !loading && (
          <div className="border-t border-purple-200 dark:border-purple-700/50 pt-3 mt-1 max-h-[40vh] overflow-y-auto pr-2">
            <div className="text-sm text-gray-700 dark:text-gray-300 leading-relaxed whitespace-pre-wrap">
              {fullMessage}
            </div>
            <div className="mt-3 text-xs text-purple-600 dark:text-purple-400">
              {new Date().toLocaleDateString()}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
