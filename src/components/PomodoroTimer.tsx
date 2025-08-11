'use client';

import { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Play, Pause, RotateCcw, X, Plus, Minus, Clock } from 'lucide-react';

export default function PomodoroTimer() {
  const [minutes, setMinutes] = useState(10);
  const [seconds, setSeconds] = useState(0);
  const [totalSeconds, setTotalSeconds] = useState(600); // 10 minutes default
  const [isActive, setIsActive] = useState(false);
  const [isPaused, setIsPaused] = useState(false);
  const [isExpanded, setIsExpanded] = useState(false);
  const intervalRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    if (isActive && !isPaused) {
      intervalRef.current = setInterval(() => {
        setTotalSeconds((prev) => {
          if (prev <= 0) {
            setIsActive(false);
            setIsPaused(false);
            // Play a subtle sound or show notification
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
    } else {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
    }

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
    };
  }, [isActive, isPaused]);

  useEffect(() => {
    setMinutes(Math.floor(totalSeconds / 60));
    setSeconds(totalSeconds % 60);
  }, [totalSeconds]);

  const handleStart = () => {
    if (totalSeconds > 0) {
      setIsActive(true);
      setIsPaused(false);
    }
  };

  const handlePause = () => {
    setIsPaused(true);
  };

  const handleStop = () => {
    setIsActive(false);
    setIsPaused(false);
    setTotalSeconds(600); // Reset to 10 minutes
  };

  const adjustTime = (minutesToAdd: number) => {
    if (!isActive) {
      const newTotal = Math.max(60, Math.min(3600, totalSeconds + (minutesToAdd * 60))); // Min 1m, Max 60m
      setTotalSeconds(newTotal);
    }
  };

  const formatTime = (mins: number, secs: number) => {
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  const progress = isActive ? ((600 - totalSeconds) / 600) * 100 : 0;

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="fixed bottom-6 right-6 z-50"
    >
      <AnimatePresence>
        {isExpanded ? (
          <motion.div
            initial={{ scale: 0.8, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0.8, opacity: 0 }}
            className="bg-white rounded-2xl shadow-2xl border border-gray-100 p-6 w-80"
          >
            {/* Header */}
            <div className="flex items-center justify-between mb-6">
              <div className="flex items-center gap-2 text-gray-700">
                <Clock size={20} />
                <span className="font-medium">Focus Timer</span>
              </div>
              <button
                onClick={() => setIsExpanded(false)}
                className="p-1 hover:bg-gray-100 rounded-lg transition-colors"
              >
                <X size={20} className="text-gray-500" />
              </button>
            </div>

            {/* Timer Display */}
            <div className="text-center mb-6">
              <div className="text-5xl font-bold text-gray-900 tracking-wider">
                {formatTime(minutes, seconds)}
              </div>
              
              {/* Progress Bar */}
              <div className="mt-4 h-2 bg-gray-100 rounded-full overflow-hidden">
                <motion.div
                  className="h-full bg-gradient-to-r from-violet-500 to-purple-600"
                  initial={{ width: 0 }}
                  animate={{ width: `${progress}%` }}
                  transition={{ duration: 0.5 }}
                />
              </div>
            </div>

            {/* Time Adjustment */}
            {!isActive && (
              <div className="flex items-center justify-center gap-4 mb-6">
                <button
                  onClick={() => adjustTime(-1)}
                  className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
                  disabled={totalSeconds <= 60}
                >
                  <Minus size={20} className={totalSeconds <= 60 ? 'text-gray-300' : 'text-gray-600'} />
                </button>
                <span className="text-sm text-gray-600 w-20 text-center">
                  {Math.floor(totalSeconds / 60)} min
                </span>
                <button
                  onClick={() => adjustTime(1)}
                  className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
                  disabled={totalSeconds >= 3600}
                >
                  <Plus size={20} className={totalSeconds >= 3600 ? 'text-gray-300' : 'text-gray-600'} />
                </button>
              </div>
            )}

            {/* Control Buttons */}
            <div className="flex gap-2">
              {!isActive || isPaused ? (
                <button
                  onClick={handleStart}
                  className="flex-1 bg-gradient-to-r from-violet-500 to-purple-600 text-white py-3 px-4 rounded-xl font-medium hover:from-violet-600 hover:to-purple-700 transition-all flex items-center justify-center gap-2"
                >
                  <Play size={20} />
                  {isPaused ? 'Resume' : 'Start'}
                </button>
              ) : (
                <button
                  onClick={handlePause}
                  className="flex-1 bg-gradient-to-r from-amber-500 to-orange-600 text-white py-3 px-4 rounded-xl font-medium hover:from-amber-600 hover:to-orange-700 transition-all flex items-center justify-center gap-2"
                >
                  <Pause size={20} />
                  Pause
                </button>
              )}
              
              {(isActive || isPaused) && (
                <button
                  onClick={handleStop}
                  className="bg-gray-100 text-gray-700 py-3 px-4 rounded-xl font-medium hover:bg-gray-200 transition-all flex items-center justify-center"
                >
                  <RotateCcw size={20} />
                </button>
              )}
            </div>

            {/* Helpful Message */}
            <p className="text-xs text-gray-500 text-center mt-4">
              Perfect for your morning journaling session
            </p>
          </motion.div>
        ) : (
          <motion.button
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            onClick={() => setIsExpanded(true)}
            className="bg-gradient-to-r from-violet-500 to-purple-600 text-white rounded-full p-4 shadow-lg hover:shadow-xl transition-all flex items-center justify-center"
          >
            <Clock size={24} />
          </motion.button>
        )}
      </AnimatePresence>
    </motion.div>
  );
}