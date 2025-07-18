'use client';

import { useState, useRef, useEffect } from 'react';

interface MeditationSessionProps {
  onComplete: () => void;
}

export default function MeditationSession({ onComplete }: MeditationSessionProps) {
  // Meditation audio state
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(300); // 5 minutes default
  const [audioLoaded, setAudioLoaded] = useState(false);
  const audioRef = useRef<HTMLAudioElement>(null);

  // Audio event handlers
  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;

    const handleLoadedMetadata = () => {
      setDuration(audio.duration);
      setAudioLoaded(true);
    };

    const handleTimeUpdate = () => {
      setCurrentTime(audio.currentTime);
    };

    const handleEnded = () => {
      setIsPlaying(false);
      setCurrentTime(0);
      // Auto-complete meditation when audio ends
      setTimeout(() => {
        onComplete();
      }, 2000);
    };

    audio.addEventListener('loadedmetadata', handleLoadedMetadata);
    audio.addEventListener('timeupdate', handleTimeUpdate);
    audio.addEventListener('ended', handleEnded);

    return () => {
      audio.removeEventListener('loadedmetadata', handleLoadedMetadata);
      audio.removeEventListener('timeupdate', handleTimeUpdate);
      audio.removeEventListener('ended', handleEnded);
    };
  }, [onComplete]);

  const togglePlayPause = () => {
    const audio = audioRef.current;
    if (!audio || !audioLoaded) return;

    if (isPlaying) {
      audio.pause();
      setIsPlaying(false);
    } else {
      audio.play();
      setIsPlaying(true);
    }
  };

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  const getRemainingTime = () => {
    return Math.max(0, Math.floor(duration - currentTime));
  };

  return (
    <div className="h-screen bg-gradient-to-br from-slate-900 to-indigo-900 flex items-center justify-center px-6">
      {/* Hidden audio element */}
      <audio 
        ref={audioRef} 
        preload="metadata"
        src="/audio/5m_meditation.wav"
      />
      
      <div className="max-w-2xl mx-auto text-center space-y-8">
        <div className="text-white space-y-6">
          <h2 className="text-2xl font-light">5-Minute Centering</h2>
          <p className="text-lg text-indigo-200 leading-relaxed">
            A gentle breathing exercise to help you connect with what&apos;s present right now
          </p>
        </div>

        {/* Meditation interface */}
        <div className="bg-white/10 backdrop-blur-sm rounded-2xl p-8 space-y-8">
          {/* Breathing visualization */}
          <div className="w-32 h-32 mx-auto relative">
            <div className={`w-full h-full bg-white/20 rounded-full transition-transform duration-4000 ${isPlaying ? 'animate-pulse scale-110' : ''}`}></div>
            <div className={`absolute inset-4 bg-white/30 rounded-full transition-transform duration-3000 ${isPlaying ? 'animate-pulse scale-90' : ''}`}></div>
            <div className="absolute inset-8 bg-white/40 rounded-full"></div>
          </div>
          
          {/* Timer display */}
          <div className="space-y-4">
            <div className="text-white/70">
              <p className="text-4xl font-light">{formatTime(getRemainingTime())}</p>
              <p className="text-sm">remaining</p>
            </div>
            
            {/* Progress bar */}
            <div className="w-full bg-white/20 rounded-full h-1.5">
              <div 
                className="bg-white/60 h-1.5 rounded-full transition-all duration-1000"
                style={{ width: `${(currentTime / duration) * 100}%` }}
              ></div>
            </div>
          </div>

          {/* Audio loading state */}
          {!audioLoaded && (
            <p className="text-white/70 text-sm">
              Loading meditation audio...
            </p>
          )}

          {/* Meditation controls */}
          <div className="flex justify-center space-x-4">
            <button 
              onClick={togglePlayPause}
              disabled={!audioLoaded}
              className="w-16 h-16 bg-white/20 rounded-full flex items-center justify-center text-white hover:bg-white/30 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isPlaying ? (
                <svg className="w-8 h-8" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M6 4h4v16H6zm8 0h4v16h-4z"/>
                </svg>
              ) : (
                <svg className="w-8 h-8 ml-1" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M8 5v14l11-7z"/>
                </svg>
              )}
            </button>
            
            <button 
              onClick={onComplete}
              className="px-6 py-3 bg-white/20 rounded-full text-white text-sm hover:bg-white/30 transition-colors"
            >
              Complete early
            </button>
          </div>

          {/* Gentle instruction */}
          <p className="text-white/80 text-sm italic">
            {isPlaying ? "Follow the guidance and breathe naturally..." : "Press play when you're ready to begin"}
          </p>
        </div>
      </div>
    </div>
  );
} 