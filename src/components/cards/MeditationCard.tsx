'use client';

import { useState, useEffect, useRef } from 'react';
import { Play, Pause, Wind, Brain, Sparkles } from 'lucide-react';
import { Button } from '../ui/button';

interface MeditationCardProps {
  title: string;
  duration: number; // in seconds
  description?: string;
  type?: 'breathing' | 'mindfulness' | 'body-scan';
}

export default function MeditationCard({ 
  title, 
  duration, 
  type = 'breathing' 
}: MeditationCardProps) {
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [audioLoaded, setAudioLoaded] = useState(false);
  const [actualDuration, setActualDuration] = useState(duration);
  
  const audioRef = useRef<HTMLAudioElement>(null);

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    return mins === 1 ? '1 minute' : `${mins} minutes`;
  };

  const formatCurrentTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const progress = (currentTime / actualDuration) * 100;

  // Audio event handlers
  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;

    const handleLoadedMetadata = () => {
      setActualDuration(audio.duration);
      setAudioLoaded(true);
    };

    const handleTimeUpdate = () => {
      setCurrentTime(audio.currentTime);
    };

    const handleEnded = () => {
      setIsPlaying(false);
      setCurrentTime(audio.duration);
    };

    const handlePause = () => {
      setIsPlaying(false);
    };

    const handlePlay = () => {
      setIsPlaying(true);
    };

    audio.addEventListener('loadedmetadata', handleLoadedMetadata);
    audio.addEventListener('timeupdate', handleTimeUpdate);
    audio.addEventListener('ended', handleEnded);
    audio.addEventListener('pause', handlePause);
    audio.addEventListener('play', handlePlay);

    return () => {
      audio.removeEventListener('loadedmetadata', handleLoadedMetadata);
      audio.removeEventListener('timeupdate', handleTimeUpdate);
      audio.removeEventListener('ended', handleEnded);
      audio.removeEventListener('pause', handlePause);
      audio.removeEventListener('play', handlePlay);
    };
  }, []);

  const handlePlayPause = () => {
    const audio = audioRef.current;
    if (!audio || !audioLoaded) return;

    if (isPlaying) {
      audio.pause();
    } else {
      // If the meditation is complete, restart from beginning
      if (currentTime >= actualDuration) {
        audio.currentTime = 0;
      }
      audio.play();
    }
  };

  const getTypeIcon = () => {
    const iconProps = { className: "w-4 h-4 text-gray-500" };
    
    switch (type) {
      case 'breathing': return <Wind {...iconProps} />;
      case 'mindfulness': return <Brain {...iconProps} />;
      case 'body-scan': return <Sparkles {...iconProps} />;
      default: return <Wind {...iconProps} />;
    }
  };

  return (
    <div className="w-full bg-white rounded-lg border border-gray-200/60 py-2 px-2.5 pr-3 my-4 shadow-sm min-w-[272px] max-w-sm">
      {/* Hidden audio element */}
      <audio 
        ref={audioRef} 
        preload="metadata"
        src="/audio/5m_meditation.wav"
      />
      <div className="flex items-center justify-between gap-2">
        {/* Left side: Icon and content */}
        <div className="flex items-center gap-1.5 flex-1 min-w-0">
          <div className="flex-shrink-0 mt-0.5">{getTypeIcon()}</div>
          <div className="flex flex-col gap-0 min-w-0 flex-1">
            <div className="flex items-center gap-2 min-w-0 overflow-hidden">
              <div className="truncate overflow-hidden min-w-0">
                <div className="font-medium leading-[140%] text-[12px] text-gray-800 truncate">{title}</div>
              </div>
            </div>
            <div className="flex items-center text-[11px] text-gray-500 min-w-0 overflow-hidden">
              <span className="text-gray-500 text-[11px] flex-shrink-0">{formatTime(actualDuration)}</span>
              {isPlaying && (
                <>
                  <span className="flex-shrink-0 text-gray-400 mx-1">•</span>
                  <span className="text-blue-600 text-[11px] font-medium">{formatCurrentTime(currentTime)}</span>
                </>
              )}
            </div>
          </div>
        </div>

        {/* Right side: Play button */}
        <Button
          onClick={handlePlayPause}
          variant="ghost"
          size="sm"
          disabled={!audioLoaded}
          className="flex-shrink-0 h-6 w-6 rounded-md hover:bg-gray-100 text-gray-500 hover:text-gray-700 p-0 disabled:opacity-50"
        >
          {!audioLoaded ? (
            <div className="w-3.5 h-3.5 rounded-full border-2 border-gray-300 border-t-gray-600 animate-spin" />
          ) : isPlaying ? (
            <Pause className="w-3.5 h-3.5" />
          ) : (
            <Play className="w-3.5 h-3.5" />
          )}
        </Button>
      </div>

      {/* Progress bar - only show when playing or paused */}
      {(isPlaying || currentTime > 0) && (
        <div className="mt-2">
          <div className="w-full bg-gray-100 rounded-full h-0.5">
            <div 
              className="bg-blue-500 h-0.5 rounded-full transition-all duration-300 ease-out"
              style={{ width: `${progress}%` }}
            ></div>
          </div>
        </div>
      )}

      {/* Completion message */}
      {currentTime >= actualDuration && (
        <div className="mt-1.5 text-center">
          <p className="text-[10px] text-green-600 font-medium">✨ Complete</p>
        </div>
      )}
    </div>
  );
} 