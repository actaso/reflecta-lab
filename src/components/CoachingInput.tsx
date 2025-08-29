'use client';

import { useRef, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Send } from 'lucide-react';

interface CoachingInputProps {
  input: string;
  onInputChange: (value: string) => void;
  onSendMessage: (message: string) => void;
  isLoading: boolean;
  commitmentCard?: React.ReactNode;
}

export default function CoachingInput({ 
  input, 
  onInputChange, 
  onSendMessage, 
  isLoading,
  commitmentCard
}: CoachingInputProps) {
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // Listen for voice transcription events from floating menu
  useEffect(() => {
    const handleVoiceTranscription = (event: CustomEvent) => {
      const { text, route } = event.detail;
      if (route === 'coach') {
        // Auto-populate the input with the transcribed text
        onInputChange(text);
        // Focus the textarea after inserting text
        setTimeout(() => {
          if (textareaRef.current) {
            textareaRef.current.focus();
            textareaRef.current.setSelectionRange(text.length, text.length);
          }
        }, 100);
      }
    };

    window.addEventListener('voiceTranscription', handleVoiceTranscription as EventListener);
    
    return () => {
      window.removeEventListener('voiceTranscription', handleVoiceTranscription as EventListener);
    };
  }, [onInputChange]);

  // Auto-resize textarea with single-line minimum and multi-line growth
  useEffect(() => {
    const textarea = textareaRef.current;
    if (textarea) {
      textarea.style.height = 'auto';
      // Ensure minimum height for 1 line (~44px) and max height for about 8-10 lines
      const minHeight = 44;
      const maxHeight = 240;
      const newHeight = Math.max(minHeight, Math.min(textarea.scrollHeight, maxHeight));
      textarea.style.height = newHeight + 'px';
    }
  }, [input]);

  const handleSubmit = (e?: React.FormEvent) => {
    e?.preventDefault();
    if (input.trim() && !isLoading) {
      onSendMessage(input);
      // Clear input after sending
      onInputChange('');
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSubmit();
    }
  };

  return (
    <div className="fixed bottom-20 left-0 right-0 z-50 max-w-[720px] mx-auto">
      {/* Commitment Card - positioned above input container */}
      {commitmentCard && (
        <div className="mb-3 px-6">
          {commitmentCard}
        </div>
      )}
      
      {/* Input Container */}
      <div className="bg-white/95 dark:bg-neutral-800/90 backdrop-blur-sm border border-neutral-200 dark:border-neutral-700 rounded-2xl shadow-lg">
        <div className="flex justify-center p-3 pb-2">
          <div className="w-full max-w-[720px]">
            <div className="flex items-end gap-3">
              {/* Text Input */}
              <div className="flex-1 relative">
                <textarea
                  ref={textareaRef}
                  value={input}
                  onChange={(e) => onInputChange(e.target.value)}
                  onKeyDown={handleKeyDown}
                  placeholder="Share what's on your mind..."
                  className="w-full resize-none rounded-md border border-neutral-200 dark:border-neutral-700 bg-white dark:bg-neutral-900 px-2 py-1 text-base leading-relaxed text-neutral-900 dark:text-neutral-100 placeholder-neutral-400 dark:placeholder-neutral-500 focus:outline-none focus:ring-2 focus:ring-neutral-300 dark:focus:ring-neutral-600 focus:border-transparent disabled:opacity-50 transition-all min-h-[44px] break-all sm:break-words whitespace-pre-wrap"
                  rows={1}
                  disabled={isLoading}
                />
              </div>
              
              {/* Send Button */}
              <div className="pb-1">
                <Button
                  type="button"
                  onClick={handleSubmit}
                  disabled={!input.trim() || isLoading}
                  className="shrink-0 h-11 w-11 rounded-full bg-neutral-700 hover:bg-neutral-800 dark:bg-neutral-200 dark:hover:bg-neutral-300 text-white dark:text-neutral-900 disabled:opacity-30 transition-all"
                  size="icon"
                >
                  <Send className="w-5 h-5" />
                </Button>
              </div>
            </div>
            
            {/* Help text */}
            <div className="mt-1 text-[11px] text-neutral-400 dark:text-neutral-500 text-center tracking-tight">
              press <span className="font-medium">enter</span> to send • <span className="font-medium">shift + enter</span> for new line
            </div>
          </div>
        </div>
      </div>
    </div>
  );
} 