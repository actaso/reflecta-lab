'use client';

import { useState, useRef, useEffect } from 'react';
import { Button } from '@/components/ui/button';

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
  const [isListening, setIsListening] = useState(false);
  const [speechSupported, setSpeechSupported] = useState(false);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const recognitionRef = useRef<any>(null);

  // Check for speech recognition support
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
      setSpeechSupported(!!SpeechRecognition);
      
      if (SpeechRecognition) {
        recognitionRef.current = new SpeechRecognition();
        recognitionRef.current.continuous = false;
        recognitionRef.current.interimResults = false;
        recognitionRef.current.lang = 'en-US';

        recognitionRef.current.onresult = (event: any) => {
          const transcript = event.results[0][0].transcript;
          onInputChange(input + transcript);
          setIsListening(false);
        };

        recognitionRef.current.onerror = () => {
          setIsListening(false);
        };

        recognitionRef.current.onend = () => {
          setIsListening(false);
        };
      }
    }
  }, [input, onInputChange]);

  // Auto-resize textarea
  useEffect(() => {
    const textarea = textareaRef.current;
    if (textarea) {
      textarea.style.height = 'auto';
      textarea.style.height = Math.min(textarea.scrollHeight, 120) + 'px';
    }
  }, [input]);

  const handleSubmit = (e?: React.FormEvent) => {
    e?.preventDefault();
    if (input.trim() && !isLoading) {
      onSendMessage(input);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSubmit();
    }
  };

  const toggleListening = () => {
    if (!speechSupported) return;
    
    if (isListening) {
      recognitionRef.current?.stop();
      setIsListening(false);
    } else {
      recognitionRef.current?.start();
      setIsListening(true);
    }
  };

    return (
    <div className="fixed bottom-0 left-0 right-0 max-w-[720px] mx-auto bg-white/95 backdrop-blur-sm border-t border-neutral-200 rounded-t-2xl shadow-lg">
      <div className="flex justify-center p-6">
        <div className="w-[720px]">
          <form onSubmit={handleSubmit} className="flex items-end gap-3">
            {/* Text Input */}
            <div className="flex-1 relative">
              <textarea
                ref={textareaRef}
                value={input}
                onChange={(e) => onInputChange(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder={isListening ? "Listening..." : "What's on your mind?"}
                className="w-[600px] resize-none rounded-2xl border border-neutral-200 bg-white px-5 py-4 text-base placeholder-neutral-400 focus:border-neutral-300 focus:outline-none disabled:opacity-50 transition-all"
                rows={1}
                disabled={isLoading || isListening}
              />
            </div>
            
            {/* Send Button */}
            <Button
              type="submit"
              disabled={!input.trim() || isLoading}
              className="shrink-0 h-12 w-12 rounded-full bg-neutral-700 hover:bg-neutral-800 disabled:opacity-30 transition-all shadow-sm"
              size="icon"
            >
              <svg
                className="w-5 h-5"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8"
                />
              </svg>
            </Button>
          </form>
          
          {/* Help text */}
          <div className="mt-3 text-xs text-neutral-400 text-center">
            {speechSupported ? (
              <>Press Enter to continue • Tap mic to speak</>
            ) : (
              <>Press Enter to continue</>
            )}
          </div>
        </div>
      </div>
    </div>
  );
} 