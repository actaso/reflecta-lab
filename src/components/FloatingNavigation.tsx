'use client';

import { usePathname } from 'next/navigation';
import Link from 'next/link';
import { useState, useEffect } from 'react';
import { BookOpen, MessageCircle, Compass, Mic, Pause, Play, X, RotateCcw } from 'lucide-react';
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
  {
    id: 'compass',
    label: 'Compass',
    href: '/compass',
    icon: <Compass size={16} strokeWidth={1.5} />,
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

  // Show transcription UI when recording/processing - morph into toolbar shape
  if (voiceRecording.state !== 'idle') {
    return (
      <div className="fixed bottom-4 left-0 right-0 flex justify-center z-40 animate-in slide-in-from-bottom-1 fade-in duration-500">
        <div className="w-full max-w-xl sm:max-w-2xl md:max-w-3xl lg:max-w-4xl mx-4 bg-white/95 dark:bg-neutral-900/95 backdrop-blur-md rounded-full border border-neutral-200/60 dark:border-neutral-700/60 shadow-xl shadow-neutral-900/20 dark:shadow-neutral-900/40 px-4 py-2.5 flex items-center justify-between gap-3 transition-all duration-300">
          
          {/* Recording State */}
          {voiceRecording.state === 'recording' && (
            <div className="flex w-full flex-wrap items-center justify-between gap-3">
              <div className="flex items-center gap-2.5 min-w-[120px]">
                <div className="w-3.5 h-3.5 bg-red-500 rounded-full animate-pulse" />
                <span className="text-sm font-medium text-neutral-900 dark:text-neutral-100">Recording...</span>
              </div>
              <AudioVisualizer 
                isRecording={true}
                audioContext={audioContext}
                analyser={analyser}
                className="hidden xs:block w-24 sm:w-32 md:w-40"
              />
              <span className="text-sm text-neutral-500 dark:text-neutral-400 font-mono ml-auto mr-2">
                {formatTime(voiceRecording.duration)}
              </span>
              <div className="flex items-center gap-2.5">
                <Button onClick={stopRecording} size="sm" className="h-9 px-4 bg-green-600 hover:bg-green-700 text-white">Convert</Button>
                <Button onClick={pauseRecording} variant="outline" size="icon" className="h-9 w-9 rounded-full"><Pause className="w-4 h-4" /></Button>
                <Button onClick={resetRecording} variant="outline" size="icon" className="h-9 w-9 rounded-full text-red-600 hover:text-red-700"><X className="w-4 h-4" /></Button>
              </div>
            </div>
          )}

          {/* Paused State */}
          {voiceRecording.state === 'paused' && (
            <div className="flex w-full flex-wrap items-center justify-between gap-3">
              <div className="flex items-center gap-2.5 min-w-[100px]">
                <div className="w-3.5 h-3.5 bg-orange-500 rounded-full" />
                <span className="text-sm font-medium text-neutral-900 dark:text-neutral-100">Paused</span>
              </div>
              <AudioVisualizer isRecording={false} audioContext={audioContext} analyser={analyser} className="hidden xs:block w-24 sm:w-32 md:w-40" />
              <span className="text-sm text-neutral-500 dark:text-neutral-400 font-mono ml-auto mr-2">{formatTime(voiceRecording.duration)}</span>
              <div className="flex items-center gap-2.5">
                <Button onClick={resumeRecording} size="icon" className="h-9 w-9 rounded-full"><Play className="w-4 h-4" /></Button>
                <Button onClick={resetRecording} variant="outline" size="icon" className="h-9 w-9 rounded-full"><RotateCcw className="w-4 h-4" /></Button>
              </div>
            </div>
          )}

          {/* Processing State */}
          {voiceRecording.state === 'processing' && (
            <div className="flex w-full items-center justify-center gap-3">
              <div className="w-5 h-5 border-2 border-neutral-700 dark:border-neutral-300 border-t-transparent rounded-full animate-spin" />
              <span className="text-sm font-medium text-neutral-900 dark:text-neutral-100">Converting to text...</span>
            </div>
          )}

          {/* Reviewing State */}
          {voiceRecording.state === 'reviewing' && voiceRecording.transcription && (
            <div className="flex w-full items-center justify-between gap-3">
              <span className="text-sm font-medium text-green-600 dark:text-green-400">✓ Text added successfully</span>
              <div className="bg-neutral-50 dark:bg-neutral-800 rounded-lg p-2 max-h-20 overflow-y-auto flex-1 mx-2">
                <p className="text-sm text-neutral-700 dark:text-neutral-300 line-clamp-2">{voiceRecording.transcription}</p>
              </div>
              <Button onClick={resetRecording} variant="ghost" size="sm" className="h-9 px-3 text-xs">Done</Button>
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
    <div className="fixed bottom-4 left-0 right-0 flex justify-center z-40 animate-in slide-in-from-bottom-1 fade-in duration-500">
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