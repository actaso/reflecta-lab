'use client';

import { useState, useEffect } from 'react';
import { useUser } from '@clerk/nextjs';
import { useJournal } from '@/hooks/useJournal';
import { motion, AnimatePresence } from 'framer-motion';
import { Dialog, DialogHeader, DialogTitle, DialogContent, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { FirestoreService } from '@/lib/firestore';

interface MorningGuidanceCardProps {
  onJournalNow?: (content?: string) => void;
}

interface GuidanceResponse {
  journalQuestion: string;
  detailedMorningPrompt: string;
  reasoning: string;
  generated: boolean;
  fromCache?: boolean;
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
  const [hasGuidance, setHasGuidance] = useState(false);
  const [showAlignModal, setShowAlignModal] = useState(false);
  const [alignment, setAlignment] = useState('');
  const [isSubmittingAlignment, setIsSubmittingAlignment] = useState(false);

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
      
      if (data.generated || data.fromCache) {
        setJournalQuestion(data.journalQuestion);
        setDetailedMorningPrompt(data.detailedMorningPrompt);
        setReasoning(data.reasoning);
        setHasGuidance(true);
        
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
  };

  // Load guidance and alignment on component mount if user is authenticated
  useEffect(() => {
    if (user) {
      generateMorningGuidance();
      // Load existing alignment
      FirestoreService.getUserAccount(user.id)
        .then(userAccount => {
          if (userAccount.alignment) {
            setAlignment(userAccount.alignment);
          }
        })
        .catch(error => {
          console.error('Failed to load user alignment:', error);
        });
    }
    // No card for non-authenticated users - only show when we have real guidance
  }, [user]);

  const handleManualGenerate = () => {
    setHasGuidance(false);
    generateMorningGuidance(true);
    setIsExpanded(false); // Reset to collapsed state
    setShowReasoning(false); // Hide reasoning tooltip
  };

  const handleSaveAlignment = async () => {
    if (!user?.id || !alignment.trim()) return;
    
    setIsSubmittingAlignment(true);
    try {
      await FirestoreService.saveAlignment(user.id, alignment.trim());
      setShowAlignModal(false);
      setAlignment('');
    } catch (error) {
      console.error('Failed to save alignment:', error);
      // Could add error state here if needed
    } finally {
      setIsSubmittingAlignment(false);
    }
  };

  // Only use actual guidance data - no defaults
  const currentJournalQuestion = journalQuestion;
  const currentDetailedPrompt = detailedMorningPrompt;
  const currentReasoning = reasoning;

  return (
    <AnimatePresence>
      {hasGuidance && (
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
        
        {/* Buttons */}
        <div className="space-y-2">
          <button 
            onClick={() => onJournalNow?.(currentJournalQuestion)}
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

      {/* Alignment Modal */}
      <Dialog isOpen={showAlignModal} onClose={() => setShowAlignModal(false)}>
        <DialogHeader>
          <DialogTitle>Align Reflecta</DialogTitle>
        </DialogHeader>
        <DialogContent>
          <div className="space-y-4">
            <p className="text-sm text-neutral-600 dark:text-neutral-400">
              What is your biggest priority in life right now?
            </p>
            <Input
              value={alignment}
              onChange={(e) => setAlignment(e.target.value)}
              placeholder="Enter your biggest priority..."
              className="w-full"
              autoFocus
            />
          </div>
        </DialogContent>
        <DialogFooter>
          <Button
            variant="outline"
            onClick={() => setShowAlignModal(false)}
          >
            Cancel
          </Button>
          <Button
            onClick={handleSaveAlignment}
            disabled={!alignment.trim() || isSubmittingAlignment}
          >
            {isSubmittingAlignment ? 'Saving...' : 'Save'}
          </Button>
        </DialogFooter>
      </Dialog>
        </motion.div>
      )}
    </AnimatePresence>
  );
}