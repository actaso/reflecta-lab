'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { useUser } from '@clerk/nextjs';
import { useJournal } from '@/hooks/useJournal';
import { useAnalytics } from '@/hooks/useAnalytics';
import { motion, AnimatePresence } from 'framer-motion';
import { Dialog, DialogHeader, DialogTitle, DialogDescription, DialogContent, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import AlignmentModal from '@/components/AlignmentModal';

interface MorningGuidanceCardProps {
  onJournalNow?: (content?: string) => void;
  selectedEntryId?: string | null;
  userAlignment?: string | null;
}

interface GuidanceResponse {
  journalQuestion: string;
  detailedMorningPrompt: string;
  reasoning: string;
  generated: boolean;
  fromCache?: boolean;
}

export default function MorningGuidanceCard({ onJournalNow, selectedEntryId, userAlignment }: MorningGuidanceCardProps) {
  const { user } = useUser();
  const { entries } = useJournal(); // Get journal entries from the hook
  const {
    trackMorningGuidanceGenerated,
    trackMorningGuidanceUsed,
    trackMorningGuidanceModalOpened
  } = useAnalytics();
  const [journalQuestion, setJournalQuestion] = useState<string>('');
  const [detailedMorningPrompt, setDetailedMorningPrompt] = useState<string>('');
  const [reasoning, setReasoning] = useState<string>('');
  const [loading, setLoading] = useState(false);
  const [, setError] = useState<string | null>(null);
  const [showReasoning, setShowReasoning] = useState(false);
  const [hasGuidance, setHasGuidance] = useState(false);
  const [showAlignModal, setShowAlignModal] = useState(false);
  const [showDetailModal, setShowDetailModal] = useState(false);
  const [journaledEntryId, setJournaledEntryId] = useState<string | null>(null);
  const hasInitializedRef = useRef(false);

  const generateMorningGuidance = useCallback(async (forceGenerate = false, journalEntries = entries) => {
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
          journalEntries
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to generate morning guidance');
      }

      const data: GuidanceResponse = await response.json();
      console.log('🔍 [DEBUG] Client received API response:', data);
      
      if (data.generated || data.fromCache) {
        setJournalQuestion(data.journalQuestion);
        setDetailedMorningPrompt(data.detailedMorningPrompt);
        setReasoning(data.reasoning);
        setHasGuidance(true);
        
        // Track analytics
        trackMorningGuidanceGenerated({
          fromCache: data.fromCache,
          entryCount: journalEntries.length,
          hasAlignment: Boolean(userAlignment)
        });
        
        console.log('🔍 [DEBUG] Client updated state with:', { 
          journalQuestion: data.journalQuestion, 
          detailedMorningPrompt: data.detailedMorningPrompt, 
          reasoning: data.reasoning,
          fromCache: data.fromCache
        });
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Something went wrong');
      setHasGuidance(false);
    } finally {
      setLoading(false);
    }
  }, [trackMorningGuidanceGenerated, userAlignment]);

  // Load guidance once when user becomes available
  useEffect(() => {
    if (user && !hasInitializedRef.current) {
      hasInitializedRef.current = true;
      // Use a slight delay to ensure entries are loaded
      setTimeout(() => {
        generateMorningGuidance(false, entries);
      }, 50);
    }
    // Reset flag when user logs out
    if (!user) {
      hasInitializedRef.current = false;
    }
  }, [user]); // Only depend on user, not the function or entries

  // Track the entry the user journaled in, and hide guidance when they navigate away
  useEffect(() => {
    if (journaledEntryId === 'journaled') {
      // Allow one render cycle for the new entry to be selected, then start tracking navigation
      const timer = setTimeout(() => {
        setJournaledEntryId(selectedEntryId || null);
      }, 100);
      return () => clearTimeout(timer);
    } else if (journaledEntryId && journaledEntryId !== selectedEntryId && journaledEntryId !== 'journaled') {
      // User navigated away from the entry they journaled in - hide guidance
      setHasGuidance(false);
      setJournaledEntryId(null);
    }
  }, [selectedEntryId, journaledEntryId]);

  const handleManualGenerate = () => {
    setHasGuidance(false);
    generateMorningGuidance(true, entries);
    setShowReasoning(false); // Hide reasoning tooltip
  };


  const handleJournalNow = async (useDetailedPrompt = false) => {
    try {
      // Mark guidance as used
      await fetch('/api/morning-guidance', {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ action: 'markAsUsed' }),
      });
      
      // Format as proper HTML with heading and paragraph
      const questionHeading = currentJournalQuestion;
      let content = `<h2>${questionHeading}</h2>`;
      
      // Always add the detailed explanation as a separate paragraph if it exists and is different
      if (currentDetailedPrompt && currentDetailedPrompt !== currentJournalQuestion) {
        content += `<p>${currentDetailedPrompt}</p>`;
      } else {
        // Add empty paragraph for cursor positioning
        content += `<p></p>`;
      }
      
      // Track analytics (always using detailed content now)
      trackMorningGuidanceUsed({
        useDetailedPrompt: true, // Always true since we always include detailed explanation
        entryCount: entries.length,
        hasAlignment: Boolean(userAlignment)
      });
      
      // Set journaled state to prevent hiding
      setJournaledEntryId('journaled');
      
      // Call the parent handler
      onJournalNow?.(content);
    } catch (error) {
      console.error('Failed to mark guidance as used:', error);
      // Still call the parent handler even if marking fails - format as proper HTML
      const questionHeading = currentJournalQuestion;
      let content = `<h2>${questionHeading}</h2>`;
      // Always add the detailed explanation as a separate paragraph if it exists and is different
      if (currentDetailedPrompt && currentDetailedPrompt !== currentJournalQuestion) {
        content += `<p>${currentDetailedPrompt}</p>`;
      } else {
        // Add empty paragraph for cursor positioning
        content += `<p></p>`;
      }
      // Track analytics for error case too (always using detailed content now)
      trackMorningGuidanceUsed({
        useDetailedPrompt: true, // Always true since we always include detailed explanation
        entryCount: entries.length,
        hasAlignment: Boolean(userAlignment)
      });
      setJournaledEntryId('journaled');
      onJournalNow?.(content);
    }
  };

  // Only use actual guidance data - no defaults
  const currentJournalQuestion = journalQuestion;
  const currentDetailedPrompt = detailedMorningPrompt;
  const currentReasoning = reasoning;

  // Hide guidance if user has journaled and then navigated to a different entry
  // Special case: if journaledEntryId is 'journaled', keep showing until navigation
  const shouldShowGuidance = hasGuidance && (
    journaledEntryId === null || 
    journaledEntryId === 'journaled' ||
    journaledEntryId === selectedEntryId
  );

  return (
    <>
      <AnimatePresence>
        {shouldShowGuidance && (
          <motion.div
            key="morning-guidance-card"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            transition={{ 
              duration: 1,
              ease: "easeOut",
              delay: 2
            }}
            className="space-y-6"
          >
            {/* Header */}
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <h3 className="text-base font-medium text-neutral-900 dark:text-neutral-100">
                  Morning Guidance
                </h3>
                <button
                  onClick={() => setShowAlignModal(true)}
                  className="p-1 rounded-full hover:bg-neutral-100 dark:hover:bg-neutral-700 transition-colors"
                  title="Align Reflecta"
                >
                  <svg 
                    className="w-4 h-4 text-neutral-500 dark:text-neutral-400" 
                    fill="none" 
                    stroke="currentColor" 
                    viewBox="0 0 24 24"
                  >
                    <circle cx="12" cy="12" r="10"/>
                    <polygon points="16.24,7.76 14.12,14.12 7.76,16.24 9.88,9.88"/>
                  </svg>
                </button>
              </div>
              <p className="text-xs text-neutral-400 dark:text-neutral-500">
                Trusted by founders at Acta, Jamie, and more.
              </p>
            </div>

            {/* Content */}
            <div className="space-y-4">
              <div className="space-y-3">
                {/* Main question with expand/collapse and help icon */}
                <div className="relative">
                  <div className="flex items-start gap-2">
                    <p className="text-sm text-neutral-600 dark:text-neutral-400 leading-relaxed flex-1">
                      {currentJournalQuestion}
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
                        <div className="absolute top-6 right-0 w-72 p-3 bg-neutral-900 dark:bg-neutral-800 text-neutral-100 text-xs rounded-md shadow-lg z-10 border border-neutral-700">
                          <p className="leading-relaxed mb-2">This question is suggested by our AI coach and is backed by research on effective reflection practices for founders and entrepreneurs.</p>
                          <div className="absolute -top-1 right-2 w-2 h-2 bg-neutral-900 dark:bg-neutral-800 rotate-45 border-l border-t border-neutral-700"></div>
                        </div>
                      )}
                    </div>
                  </div>
                  
                  {/* Expand button - only show if there's different content */}
                  {currentJournalQuestion !== currentDetailedPrompt && (
                    <button
                      onClick={() => {
                        trackMorningGuidanceModalOpened();
                        setShowDetailModal(true);
                      }}
                      className="mt-2 text-xs text-neutral-500 dark:text-neutral-500 hover:text-neutral-700 dark:hover:text-neutral-300 transition-colors flex items-center gap-1"
                    >
                      Expand for more details →
                    </button>
                  )}
                </div>
              </div>
              
              {/* Buttons */}
              <div className="space-y-2">
                <button 
                  onClick={() => handleJournalNow(false)}
                  className="w-full py-2.5 px-4 text-sm font-medium text-neutral-600 dark:text-neutral-400 hover:text-neutral-900 dark:hover:text-neutral-100 border border-neutral-200 dark:border-neutral-700 hover:border-neutral-300 dark:hover:border-neutral-600 rounded-md transition-colors duration-200"
                >
                  Journal Now
                </button>
                
                {/* Manual generation button for dev environment */}
                {process.env.NODE_ENV === 'development' && (
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
          </motion.div>
        )}
      </AnimatePresence>
      
      {/* Detail Modal */}
      <Dialog isOpen={showDetailModal} onClose={() => setShowDetailModal(false)}>
        <DialogHeader>
          <DialogTitle>Morning Guidance Details</DialogTitle>
          <DialogDescription>
            A deeper reflection prompt crafted by our AI coach based on your journal history and research-backed reflection practices.
          </DialogDescription>
        </DialogHeader>
        <DialogContent>
          <div className="space-y-4">
            <div className="p-4 bg-neutral-50 dark:bg-neutral-900 rounded-lg border border-neutral-200 dark:border-neutral-700">
              <p className="text-sm text-neutral-700 dark:text-neutral-300 leading-relaxed">
                {currentDetailedPrompt}
              </p>
            </div>
            {currentReasoning && (
              <div className="space-y-2">
                <h4 className="text-sm font-medium text-neutral-900 dark:text-neutral-100">Why this question?</h4>
                <p className="text-sm text-neutral-600 dark:text-neutral-400 leading-relaxed">
                  {currentReasoning}
                </p>
              </div>
            )}
          </div>
        </DialogContent>
        <DialogFooter>
          <Button
            variant="outline"
            onClick={() => setShowDetailModal(false)}
          >
            Close
          </Button>
          <Button
            onClick={() => {
              setShowDetailModal(false);
              handleJournalNow(true);
            }}
          >
            Journal with this prompt
          </Button>
        </DialogFooter>
      </Dialog>

      {/* Settings Alignment Modal - for updating */}
      <AlignmentModal
        isOpen={showAlignModal}
        onClose={() => setShowAlignModal(false)}
        isInitial={false}
      />
    </>
  );
}