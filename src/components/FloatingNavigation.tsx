'use client';

import { usePathname } from 'next/navigation';
import Link from 'next/link';
import { useState, useEffect } from 'react';
import { BookOpen, MessageCircle, Mic, Pause, Play, X, RotateCcw } from 'lucide-react';
import { useGlobalVoiceRecorder } from '../hooks/useGlobalVoiceRecorder';
import AudioVisualizer from './AudioVisualizer';
import { Button } from './ui/button';

type NavItem = {
  id: string;
  label: string;
  href: string;
  icon: React.ReactNode;
};

const navigation: NavItem[] = [
  {
    id: 'journal',
    label: 'Journal',
    href: '/',
    icon: <BookOpen size={16} strokeWidth={1.5} />,
  },
  {
    id: 'coach',
    label: 'Coach',
    href: '/coach',
    icon: <MessageCircle size={16} strokeWidth={1.5} />,
  },
];

export default function FloatingNavigation() {
  const pathname = usePathname();
  const [mounted, setMounted] = useState(false);
  const {
    voiceRecording,
    startRecording,
    stopRecording,
    pauseRecording,
    resumeRecording,
    resetRecording,
    audioContext,
    analyser,
    setTranscriptionCallback
  } = useGlobalVoiceRecorder();

  useEffect(() => {
    setMounted(true);
  }, []);

  // Set up transcription callback based on current route
  useEffect(() => {
    if (!mounted) return;

    const handleTranscription = (text: string) => {
      if (pathname === '/coach') {
        // For coaching route, find the coaching input and set its value
        const event = new CustomEvent('voiceTranscription', { detail: { text, route: 'coach' } });
        window.dispatchEvent(event);
      } else if (pathname === '/') {
        // For journal route, inject into the tiptap editor
        const event = new CustomEvent('voiceTranscription', { detail: { text, route: 'journal' } });
        window.dispatchEvent(event);
      }
    };

    setTranscriptionCallback(handleTranscription);
  }, [pathname, mounted, setTranscriptionCallback]);

  // Auto-reset after showing success state for 1 second
  useEffect(() => {
    if (voiceRecording.state === 'reviewing') {
      const timer = setTimeout(() => {
        resetRecording();
      }, 1000);

      return () => clearTimeout(timer);
    }
  }, [voiceRecording.state, resetRecording]);

  if (!mounted) return null;

  const handleMicClick = () => {
    if (voiceRecording.state === 'idle') {
      startRecording();
    } else if (voiceRecording.state === 'recording') {
      stopRecording();
    } else if (voiceRecording.state === 'paused') {
      resumeRecording();
    }
  };

  const formatTime = (seconds: number): string => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  // Show transcription UI when recording/processing
  if (voiceRecording.state !== 'idle') {
    return (
      <div className="fixed bottom-4 left-0 right-0 flex justify-center z-50 animate-in slide-in-from-bottom-1 fade-in duration-500">
        <div className="bg-white/95 dark:bg-neutral-900/95 backdrop-blur-md rounded-2xl border border-neutral-200/40 dark:border-neutral-700/40 shadow-xl shadow-neutral-900/20 dark:shadow-neutral-900/40 p-4 max-w-md mx-4">
          
          {/* Recording State */}
          {voiceRecording.state === 'recording' && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 bg-red-500 rounded-full animate-pulse"></div>
                  <span className="text-sm font-medium text-neutral-900 dark:text-neutral-100">
                    Recording...
                  </span>
                </div>
                <span className="text-sm text-neutral-500 dark:text-neutral-400 font-mono">
                  {formatTime(voiceRecording.duration)}
                </span>
              </div>
              
              <AudioVisualizer 
                isRecording={true}
                audioContext={audioContext}
                analyser={analyser}
                className="w-full"
              />
              
              <div className="flex items-center justify-center gap-2">
                <Button
                  onClick={stopRecording}
                  variant="default"
                  size="sm"
                  className="bg-green-600 hover:bg-green-700 text-white flex items-center gap-1.5 px-4"
                >
                  <span className="text-sm">Convert to text</span>
                </Button>
                <Button
                  onClick={pauseRecording}
                  variant="outline"
                  size="icon"
                  className="rounded-full w-9 h-9"
                >
                  <Pause className="w-4 h-4" />
                </Button>
                <Button
                  onClick={resetRecording}
                  variant="outline"
                  size="icon"
                  className="rounded-full w-9 h-9 text-red-600 hover:text-red-700"
                >
                  <X className="w-4 h-4" />
                </Button>
              </div>
            </div>
          )}

          {/* Paused State */}
          {voiceRecording.state === 'paused' && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 bg-orange-500 rounded-full"></div>
                  <span className="text-sm font-medium text-neutral-900 dark:text-neutral-100">
                    Paused
                  </span>
                </div>
                <span className="text-sm text-neutral-500 dark:text-neutral-400 font-mono">
                  {formatTime(voiceRecording.duration)}
                </span>
              </div>
              
              <AudioVisualizer 
                isRecording={false}
                audioContext={audioContext}
                analyser={analyser}
                className="w-full"
              />
              
              <div className="flex items-center justify-center gap-2">
                <Button
                  onClick={resumeRecording}
                  variant="default"
                  size="icon"
                  className="rounded-full w-9 h-9"
                >
                  <Play className="w-4 h-4" />
                </Button>
                <Button
                  onClick={resetRecording}
                  variant="outline"
                  size="icon"
                  className="rounded-full w-9 h-9"
                >
                  <RotateCcw className="w-4 h-4" />
                </Button>
              </div>
            </div>
          )}

          {/* Processing State */}
          {voiceRecording.state === 'processing' && (
            <div className="space-y-4">
              <div className="flex items-center justify-center gap-2">
                <div className="w-5 h-5 border-2 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
                <span className="text-sm font-medium text-neutral-900 dark:text-neutral-100">
                  Converting to text...
                </span>
              </div>
            </div>
          )}

          {/* Reviewing State */}
          {voiceRecording.state === 'reviewing' && voiceRecording.transcription && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium text-green-600 dark:text-green-400">
                  ✓ Text added successfully
                </span>
                <Button
                  onClick={resetRecording}
                  variant="ghost"
                  size="sm"
                  className="text-xs"
                >
                  Done
                </Button>
              </div>
              
              <div className="bg-neutral-50 dark:bg-neutral-800 rounded-lg p-3 max-h-20 overflow-y-auto">
                <p className="text-sm text-neutral-700 dark:text-neutral-300">
                  {voiceRecording.transcription}
                </p>
              </div>
            </div>
          )}

          {/* Error State */}
          {voiceRecording.error && (
            <div className="space-y-4">
              <div className="flex items-center gap-2">
                <span className="text-sm font-medium text-red-600 dark:text-red-400">
                  Error: {voiceRecording.error}
                </span>
              </div>
              <Button
                onClick={resetRecording}
                variant="outline"
                size="sm"
                className="w-full"
              >
                Try again
              </Button>
            </div>
          )}
        </div>
      </div>
    );
  }

  // Show normal navigation when not recording
  return (
    <div className="fixed bottom-4 left-0 right-0 flex justify-center z-50 animate-in slide-in-from-bottom-1 fade-in duration-500">
      <nav className="flex items-center gap-1 px-1.5 py-1.5 bg-white/80 dark:bg-neutral-900/80 backdrop-blur-md rounded-full border border-neutral-200/40 dark:border-neutral-700/40 shadow-lg shadow-neutral-900/10 dark:shadow-neutral-900/30">
        {navigation.map((item) => {
          const isActive = pathname === item.href;
          return (
            <Link
              key={item.id}
              href={item.href}
              className={`
                group relative flex items-center justify-center w-9 h-9 rounded-full transition-all duration-200 ease-out
                ${isActive 
                  ? 'bg-neutral-900/12 dark:bg-neutral-100/15 text-neutral-900 dark:text-neutral-100 shadow-sm shadow-neutral-900/10 border border-neutral-900/10 dark:border-neutral-100/10' 
                  : 'text-neutral-500 dark:text-neutral-400 hover:text-neutral-700 dark:hover:text-neutral-200 hover:bg-neutral-900/6 dark:hover:bg-neutral-100/8 hover:shadow-sm hover:shadow-neutral-900/5'
                }
              `}
            >
              {item.icon}
            </Link>
          );
        })}
        
        {/* Mic Button */}
        <button
          onClick={handleMicClick}
          className="group relative flex items-center justify-center w-9 h-9 rounded-full transition-all duration-200 ease-out text-neutral-500 dark:text-neutral-400 hover:text-neutral-700 dark:hover:text-neutral-200 hover:bg-neutral-900/6 dark:hover:bg-neutral-100/8 hover:shadow-sm hover:shadow-neutral-900/5"
        >
          <Mic size={16} strokeWidth={1.5} />
        </button>
      </nav>
    </div>
  );
} 