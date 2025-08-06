'use client';

import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Zap, X, Clock } from 'lucide-react';
import Link from 'next/link';
import { usePulse } from '../hooks/usePulse';

export default function PulseReminder() {
  const { pulseData, loading } = usePulse();
  const [dismissed, setDismissed] = useState(false);

  // Don't show if loading, already completed today, or dismissed
  const shouldShow = !loading && 
                    pulseData && 
                    !pulseData.hasCompletedToday && 
                    !dismissed;

  // Get time-based messaging
  const getTimeMessage = () => {
    const hour = new Date().getHours();
    if (hour < 12) return 'Good morning! Start your day with a leadership pulse check.';
    if (hour < 17) return 'Quick break? Check in with your leadership pulse.';
    return 'Wrap up your day with a quick leadership pulse check.';
  };

  const handleDismiss = () => {
    setDismissed(true);
  };

  return (
    <AnimatePresence>
      {shouldShow && (
        <motion.div
          initial={{ opacity: 0, y: -20, scale: 0.95 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: -20, scale: 0.95 }}
          transition={{ duration: 0.3 }}
          className="mb-6"
        >
          <div className="bg-gradient-to-r from-blue-50 to-indigo-50 border border-blue-200 rounded-xl p-4 relative overflow-hidden">
            {/* Background pattern */}
            <div className="absolute inset-0 opacity-5">
              <div className="absolute top-0 right-0 w-32 h-32 transform rotate-12">
                <Zap size={120} className="text-blue-600" />
              </div>
            </div>

            {/* Content */}
            <div className="relative flex items-center justify-between">
              <div className="flex items-center gap-4 flex-1">
                <div className="flex-shrink-0">
                  <div className="w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center">
                    <Zap className="text-blue-600" size={20} />
                  </div>
                </div>
                
                <div className="flex-1">
                  <h3 className="font-semibold text-blue-900 mb-1">
                    Leadership Pulse
                  </h3>
                  <p className="text-blue-700 text-sm mb-2">
                    {getTimeMessage()}
                  </p>
                  <div className="flex items-center gap-4">
                    <Link
                      href="/pulse"
                      className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700 transition-colors"
                    >
                      <Clock size={16} />
                      Take Pulse (60s)
                    </Link>
                    <span className="text-blue-600 text-xs">
                      Track mood, stress, and confidence
                    </span>
                  </div>
                </div>
              </div>

              {/* Dismiss button */}
              <button
                onClick={handleDismiss}
                className="flex-shrink-0 p-1 text-blue-400 hover:text-blue-600 transition-colors"
                title="Dismiss for today"
              >
                <X size={16} />
              </button>
            </div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}