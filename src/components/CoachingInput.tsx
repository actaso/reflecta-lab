'use client';

import { useRef, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Send } from 'lucide-react';

interface CoachingInputProps {
  input: string;
  onInputChange: (value: string) => void;
  onSendMessage: (message: string) => void;
  isLoading: boolean;
}

export default function CoachingInput({ 
  input, 
  onInputChange, 
  onSendMessage, 
  isLoading 
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

  // Auto-resize textarea with generous max height and minimum height
  useEffect(() => {
    const textarea = textareaRef.current;
    if (textarea) {
      textarea.style.height = 'auto';
      // Ensure minimum height for at least 3 lines (about 72px) and max height for about 8-10 lines
      const minHeight = 72;
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
    <div className="fixed bottom-0 left-0 right-0 max-w-[720px] mx-auto bg-white/95 backdrop-blur-sm border border-neutral-200 rounded-t-2xl shadow-lg">
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
                placeholder="Share what's on your mind... write as much as you'd like"
                className="w-full resize-none rounded-md border border-neutral-200 bg-white px-2 py-1 text-base leading-relaxed placeholder-neutral-400 focus:outline-none focus:ring-2 focus:ring-neutral-300 focus:border-transparent disabled:opacity-50 transition-all min-h-[72px]"
                rows={3}
                disabled={isLoading}
              />
            </div>
            
            {/* Send Button */}
            <div className="pb-1">
              <Button
                type="button"
                onClick={handleSubmit}
                disabled={!input.trim() || isLoading}
                className="shrink-0 h-11 w-11 rounded-full bg-neutral-700 hover:bg-neutral-800 disabled:opacity-30 transition-all"
                size="icon"
              >
                <Send className="w-5 h-5" />
              </Button>
            </div>
          </div>
          
          {/* Help text */}
          <div className="mt-1 text-[11px] text-neutral-400 text-center tracking-tight">
            press <span className="font-medium">enter</span> to send • <span className="font-medium">shift + enter</span> for new line
          </div>
        </div>
      </div>
    </div>
  );
} 