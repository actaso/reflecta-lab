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
    <div className="fixed bottom-0 left-0 right-0 max-w-[720px] mx-auto bg-white/95 backdrop-blur-sm border border-neutral-200 rounded-t-2xl shadow-lg">
      <div className="flex justify-center p-6">
        <div className="w-full max-w-[720px]">
          <div className="flex items-end gap-3">
            {/* Text Input - now much more spacious */}
            <div className="flex-1 relative">
              <textarea
                ref={textareaRef}
                value={input}
                onChange={(e) => onInputChange(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder={isListening ? "Listening..." : "Share what's on your mind... write as much as you'd like"}
                className="w-full resize-none rounded-2xl border border-neutral-200 bg-white px-5 py-4 text-base leading-relaxed placeholder-neutral-400 focus:outline-none focus:ring-2 focus:ring-neutral-300 focus:border-transparent disabled:opacity-50 transition-all min-h-[72px]"
                rows={3}
                disabled={isLoading || isListening}
              />
            </div>
            
            {/* Button container */}
            <div className="flex flex-col gap-2 pb-1">
              {/* Mic Button */}
              {speechSupported && (
                <Button
                  type="button"
                  onClick={toggleListening}
                  className={`shrink-0 h-11 w-11 rounded-full ${
                    isListening 
                      ? 'bg-red-500 hover:bg-red-600' 
                      : 'bg-neutral-100 hover:bg-neutral-200'
                  } disabled:opacity-30 transition-all`}
                  size="icon"
                >
                  <svg
                    className={`w-5 h-5 ${isListening ? 'text-white' : 'text-neutral-600'}`}
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z"
                    />
                  </svg>
                </Button>
              )}
              
              {/* Send Button */}
              <Button
                type="button"
                onClick={handleSubmit}
                disabled={!input.trim() || isLoading}
                className="shrink-0 h-11 w-11 rounded-full bg-neutral-700 hover:bg-neutral-800 disabled:opacity-30 transition-all"
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
            </div>
          </div>
          
          {/* Help text */}
          <div className="mt-3 text-sm text-neutral-500 text-center">
            {speechSupported ? (
              <>Press <span className="font-medium">Enter</span> to send • <span className="font-medium">Shift + Enter</span> for new line • Tap mic to speak</>
            ) : (
              <>Press <span className="font-medium">Enter</span> to send • <span className="font-medium">Shift + Enter</span> for new line</>
            )}
          </div>
        </div>
      </div>
    </div>
  );
} 