'use client';

import { useState, useRef, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { useVoiceRecorder } from '@/hooks/useVoiceRecorder';
import { Mic, X, Send, Pause, Play, RotateCcw } from 'lucide-react';
import AudioVisualizer from './AudioVisualizer';

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
  const {
    voiceRecording,
    startRecording,
    stopRecording,
    pauseRecording,
    resumeRecording,
    resetRecording,
    audioContext,
    analyser
  } = useVoiceRecorder();

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
      // Reset recording state after sending
      if (voiceRecording.state === 'reviewing') {
        resetRecording();
      }
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

  // Handle keyboard shortcuts for voice recording
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Ctrl/Cmd + Shift + R to start/stop recording
      if ((e.ctrlKey || e.metaKey) && e.shiftKey && e.key === 'R') {
        e.preventDefault();
        if (voiceRecording.state === 'idle') {
          startRecording();
        } else if (['recording', 'paused'].includes(voiceRecording.state)) {
          stopRecording();
        }
      }
      
      // Space to pause/resume recording (only when recording)
      if (e.code === 'Space' && ['recording', 'paused'].includes(voiceRecording.state)) {
        e.preventDefault();
        if (voiceRecording.state === 'recording') {
          pauseRecording();
        } else if (voiceRecording.state === 'paused') {
          resumeRecording();
        }
      }
      
      // Escape to cancel recording
      if (e.key === 'Escape' && voiceRecording.state !== 'idle') {
        e.preventDefault();
        resetRecording();
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [voiceRecording.state, startRecording, stopRecording, pauseRecording, resumeRecording, resetRecording]);

  // Watch for transcription completion
  useEffect(() => {
    if (voiceRecording.state === 'reviewing' && voiceRecording.transcription) {
      onInputChange(voiceRecording.transcription);
    }
  }, [voiceRecording.state, voiceRecording.transcription, onInputChange]);

  return (
    <div className="fixed bottom-0 left-0 right-0 max-w-[720px] mx-auto bg-white/95 backdrop-blur-sm border border-neutral-200 rounded-t-2xl shadow-lg">
      <div className="flex justify-center p-3 pb-2">
        <div className="w-full max-w-[720px]">
          {/* Recording indicator */}
          {voiceRecording.state === 'recording' && (
            <div className="absolute -top-12 right-4 z-20 flex items-center gap-2 bg-red-500 text-white px-3 py-2 rounded-full shadow-lg">
              <div className="w-2 h-2 bg-white rounded-full animate-pulse"></div>
              <span className="text-sm font-medium">Recording</span>
              <span className="text-xs font-mono ml-1">{voiceRecording.duration}s</span>
            </div>
          )}

          {voiceRecording.state === 'recording' && (
            <div className="flex items-center gap-4 bg-gray-50 rounded-lg p-4 mb-4">
              <AudioVisualizer 
                isRecording={true}
                audioContext={audioContext}
                analyser={analyser}
                className="flex-1"
              />
              <Button
                onClick={stopRecording}
                variant="default"
                size="sm"
                className="bg-green-600 hover:bg-green-700 text-white flex items-center gap-1.5 px-3"
                title="Finish and transcribe (Ctrl+Shift+R)"
              >
                <span className="text-sm">Convert to text</span>
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" className="opacity-90">
                  {/* Microphone */}
                  <path d="M12 4C10.8954 4 10 4.89543 10 6V12C10 13.1046 10.8954 14 12 14C13.1046 14 14 13.1046 14 12V6C14 4.89543 13.1046 4 12 4Z" fill="currentColor"/>
                  <path d="M7 12C7 15.3137 9.68629 18 13 18M13 18C16.3137 18 19 15.3137 19 12M13 18V21M13 21H16M13 21H10" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
                  {/* Text lines */}
                  <path d="M6 9H4M8 9H6M20 9H8" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
                  <path d="M14 15H12M16 15H14M20 15H16" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
                </svg>
              </Button>
              <Button
                onClick={pauseRecording}
                variant="outline"
                size="icon"
                className="rounded-full w-10 h-10 flex-shrink-0"
                title="Pause recording (Space)"
              >
                <Pause className="w-5 h-5" />
              </Button>
              <Button
                onClick={resetRecording}
                variant="outline"
                size="icon"
                className="rounded-full w-10 h-10 flex-shrink-0 text-red-600 hover:text-red-700 hover:border-red-200"
                title="Cancel recording (Escape)"
              >
                <X className="w-5 h-5" />
              </Button>
            </div>
          )}

          {voiceRecording.state === 'paused' && (
            <div className="flex items-center gap-4 bg-gray-50 rounded-lg p-4 mb-4">
              <AudioVisualizer 
                isRecording={false}
                audioContext={audioContext}
                analyser={analyser}
                className="flex-1"
              />
              <Button
                onClick={resumeRecording}
                variant="outline"
                size="icon"
                className="rounded-full w-10 h-10 flex-shrink-0"
                title="Resume recording (Space)"
              >
                <Play className="w-5 h-5" />
              </Button>
              <Button
                onClick={resetRecording}
                variant="outline"
                size="icon"
                className="rounded-full w-10 h-10 flex-shrink-0"
                title="Reset recording (Escape)"
              >
                <RotateCcw className="w-5 h-5" />
              </Button>
            </div>
          )}

          {voiceRecording.state === 'processing' && (
            <div className="flex items-center gap-4 bg-blue-50 rounded-lg p-4 mb-4">
              <div className="flex-1 flex items-center gap-3">
                <div className="text-blue-600 text-sm">
                  Transcribing your voice message...
                </div>
                <div className="flex items-center space-x-1">
                  <div className="w-1.5 h-1.5 bg-blue-600 rounded-full animate-pulse"></div>
                  <div className="w-1.5 h-1.5 bg-blue-600 rounded-full animate-pulse" style={{ animationDelay: '0.3s' }}></div>
                  <div className="w-1.5 h-1.5 bg-blue-600 rounded-full animate-pulse" style={{ animationDelay: '0.6s' }}></div>
                </div>
              </div>
              <Button
                onClick={resetRecording}
                variant="outline"
                size="icon"
                className="rounded-full w-10 h-10 flex-shrink-0"
              >
                <X className="w-5 h-5" />
              </Button>
            </div>
          )}

          <div className="flex items-end gap-3">
            {/* Text Input */}
            <div className="flex-1 relative">
              <textarea
                ref={textareaRef}
                value={input}
                onChange={(e) => onInputChange(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder={
                  (() => {
                    switch (voiceRecording.state) {
                      case 'processing':
                        return "Transcribing...";
                      case 'reviewing':
                        return "Review your transcribed message...";
                      default:
                        return "Share what's on your mind... write as much as you'd like";
                    }
                  })()
                }
                className="w-full resize-none rounded-md border border-neutral-200 bg-white px-2 py-1 text-base leading-relaxed placeholder-neutral-400 focus:outline-none focus:ring-2 focus:ring-neutral-300 focus:border-transparent disabled:opacity-50 transition-all min-h-[72px]"
                rows={3}
                disabled={isLoading || ['processing', 'recording'].includes(voiceRecording.state)}
              />
            </div>
            
            {/* Button container */}
            <div className="flex flex-col gap-2 pb-1">
              {/* Mic Button */}
              <Button
                type="button"
                onClick={() => startRecording()}
                disabled={voiceRecording.state !== 'idle'}
                className={`shrink-0 h-11 w-11 rounded-full ${
                  ['recording', 'processing'].includes(voiceRecording.state)
                    ? 'bg-red-500 hover:bg-red-600' 
                    : 'bg-neutral-100 hover:bg-neutral-200'
                } disabled:opacity-30 transition-all`}
                size="icon"
                title="Record voice message (Ctrl+Shift+R)"
              >
                <Mic className={`w-5 h-5 ${['recording', 'processing'].includes(voiceRecording.state) ? 'text-white' : 'text-neutral-600'}`} />
              </Button>
              
              {/* Send Button */}
              <Button
                type="button"
                onClick={handleSubmit}
                disabled={!input.trim() || isLoading || voiceRecording.state === 'processing'}
                className="shrink-0 h-11 w-11 rounded-full bg-neutral-700 hover:bg-neutral-800 disabled:opacity-30 transition-all"
                size="icon"
              >
                <Send className="w-5 h-5" />
              </Button>
            </div>
          </div>
          
          {/* Help text */}
          <div className="mt-1 text-[11px] text-neutral-400 text-center tracking-tight">
            press <span className="font-medium">enter</span> to send • <span className="font-medium">shift + enter</span> for new line • <span className="font-medium">ctrl+shift+r</span> to record
          </div>

          {/* Error message */}
          {voiceRecording.error && (
            <div className="mt-2 text-sm text-red-600 text-center">
              {voiceRecording.error}
            </div>
          )}
        </div>
      </div>
    </div>
  );
} 