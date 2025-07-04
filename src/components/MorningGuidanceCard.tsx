'use client';

import { useState, useEffect } from 'react';
import { useUser } from '@clerk/nextjs';
import { useJournal } from '@/hooks/useJournal';

interface MorningGuidanceCardProps {
  onJournalNow?: () => void;
}

interface GuidanceResponse {
  journalQuestion: string;
  detailedMorningPrompt: string;
  reasoning: string;
  generated: boolean;
}

export default function MorningGuidanceCard({ onJournalNow }: MorningGuidanceCardProps) {
  const { user } = useUser();
  const { entries } = useJournal(); // Get journal entries from the hook
  const [journalQuestion, setJournalQuestion] = useState<string>('');
  const [detailedMorningPrompt, setDetailedMorningPrompt] = useState<string>('');
  const [reasoning, setReasoning] = useState<string>('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isExpanded, setIsExpanded] = useState(false);
  const [showReasoning, setShowReasoning] = useState(false);

  const generateMorningGuidance = async (forceGenerate = false) => {
    setLoading(true);
    setError(null);
    
    try {
      const response = await fetch('/api/morning-guidance', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ 
          forceGenerate,
          journalEntries: entries
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to generate morning guidance');
      }

      const data: GuidanceResponse = await response.json();
      console.log('🔍 [DEBUG] Client received API response:', data);
      
      if (data.generated) {
        setJournalQuestion(data.journalQuestion);
        setDetailedMorningPrompt(data.detailedMorningPrompt);
        setReasoning(data.reasoning);
        console.log('🔍 [DEBUG] Client updated state with:', { 
          journalQuestion: data.journalQuestion, 
          detailedMorningPrompt: data.detailedMorningPrompt, 
          reasoning: data.reasoning 
        });
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Something went wrong');
    } finally {
      setLoading(false);
    }
  };

  // Load guidance on component mount if user is authenticated and has entries
  useEffect(() => {
    if (user && entries.length > 0) {
      generateMorningGuidance();
    }
  }, [user, entries]);

  const handleManualGenerate = () => {
    generateMorningGuidance(true);
    setIsExpanded(false); // Reset to collapsed state
    setShowReasoning(false); // Hide reasoning tooltip
  };

  // Default guidance for non-authenticated users or when no guidance is available
  const defaultJournalQuestion = "What three things are you most grateful for today?";
  const defaultDetailedPrompt = "Start your day with intentional reflection. What three things are you most grateful for today? What energy do you want to bring to your work and relationships?";
  const defaultReasoning = "Gratitude practice helps set a positive tone for the day and aligns your mindset with abundance rather than scarcity.";

  const currentJournalQuestion = user && journalQuestion ? journalQuestion : defaultJournalQuestion;
  const currentDetailedPrompt = user && detailedMorningPrompt ? detailedMorningPrompt : defaultDetailedPrompt;
  const currentReasoning = user && reasoning ? reasoning : defaultReasoning;

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
        {error && (
          <div className="p-3 bg-red-50 border border-red-200 rounded-md">
            <p className="text-sm text-red-600">{error}</p>
          </div>
        )}

        {loading ? (
          <div className="flex items-center justify-center py-8">
            <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-neutral-600"></div>
          </div>
        ) : (
          <div className="space-y-3">
            {/* Main question with expand/collapse and help icon */}
            <div className="relative">
              <div className="flex items-start gap-2">
                <p className="text-sm text-neutral-600 dark:text-neutral-400 leading-relaxed flex-1">
                  {isExpanded ? currentDetailedPrompt : currentJournalQuestion}
                </p>
                
                {/* Help icon with tooltip */}
                <div className="relative">
                  <button
                    onMouseEnter={() => setShowReasoning(true)}
                    onMouseLeave={() => setShowReasoning(false)}
                    className="flex-shrink-0 w-4 h-4 rounded-full bg-neutral-200 dark:bg-neutral-700 text-neutral-500 dark:text-neutral-400 hover:bg-neutral-300 dark:hover:bg-neutral-600 flex items-center justify-center text-xs font-medium transition-colors"
                  >
                    ?
                  </button>
                  
                  {/* Reasoning tooltip */}
                  {showReasoning && (
                    <div className="absolute top-6 right-0 w-64 p-3 bg-neutral-900 dark:bg-neutral-800 text-neutral-100 text-xs rounded-md shadow-lg z-10 border border-neutral-700">
                      <p className="leading-relaxed">{currentReasoning}</p>
                      <div className="absolute -top-1 right-2 w-2 h-2 bg-neutral-900 dark:bg-neutral-800 rotate-45 border-l border-t border-neutral-700"></div>
                    </div>
                  )}
                </div>
              </div>
              
              {/* Expand/collapse button - only show if there's different content */}
              {currentJournalQuestion !== currentDetailedPrompt && (
                <button
                  onClick={() => setIsExpanded(!isExpanded)}
                  className="mt-2 text-xs text-neutral-500 dark:text-neutral-500 hover:text-neutral-700 dark:hover:text-neutral-300 transition-colors"
                >
                  {isExpanded ? '← Show shorter version' : 'Expand for more detail →'}
                </button>
              )}
            </div>
          </div>
        )}
        
        {/* Buttons */}
        <div className="space-y-2">
          <button 
            onClick={onJournalNow}
            className="w-full py-2.5 px-4 text-sm font-medium text-neutral-600 dark:text-neutral-400 hover:text-neutral-900 dark:hover:text-neutral-100 border border-neutral-200 dark:border-neutral-700 hover:border-neutral-300 dark:hover:border-neutral-600 rounded-md transition-colors duration-200"
          >
            Journal Now
          </button>
          
          {/* Manual generation button for dev environment */}
          {user && process.env.NODE_ENV === 'development' && (
            <button 
              onClick={handleManualGenerate}
              disabled={loading}
              className="w-full py-2 px-4 text-xs font-medium text-neutral-500 dark:text-neutral-500 hover:text-neutral-700 dark:hover:text-neutral-300 border border-neutral-200 dark:border-neutral-700 hover:border-neutral-300 dark:hover:border-neutral-600 rounded-md transition-colors duration-200 disabled:opacity-50"
            >
              {loading ? 'Generating...' : 'Generate New Guidance (Dev)'}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}