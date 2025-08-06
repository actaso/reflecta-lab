'use client';

import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Zap, ArrowLeft } from 'lucide-react';
import { useRouter } from 'next/navigation';
import confetti from 'canvas-confetti';

import PulseSurvey from '../../components/PulseSurvey';
import PulseResults from '../../components/PulseResults';
import LeadershipRing from '../../components/LeadershipRing';
import { usePulse } from '../../hooks/usePulse';
import { PulseEntry } from '../../types/journal';

type ViewState = 'welcome' | 'survey' | 'results';

export default function PulsePage() {
  const router = useRouter();
  const { pulseData, loading, error, submitPulse, refreshData } = usePulse();
  const [viewState, setViewState] = useState<ViewState>('welcome');
  const [completedEntry, setCompletedEntry] = useState<PulseEntry | null>(null);
  const [, setSurveyProgress] = useState({ current: 1, total: 5 });

  useEffect(() => {
    if (pulseData && !loading) {
      if (pulseData.hasCompletedToday && pulseData.todayEntry) {
        setCompletedEntry(pulseData.todayEntry);
        setViewState('results');
      } else {
        setViewState('welcome');
      }
    }
  }, [pulseData, loading]);

  const handleStartSurvey = () => {
    setViewState('survey');
  };

  const handleSurveyComplete = async (responses: {
    moodPA: number;
    moodNA: number;
    stress1: number;
    stress2: number;
    selfEfficacy: number;
  }) => {
    try {
      const entry = await submitPulse(responses);
      setCompletedEntry(entry);
      setViewState('results');
      
      // Celebrate completion
      confetti({
        particleCount: 100,
        spread: 70,
        origin: { y: 0.6 }
      });
    } catch (err) {
      console.error('Failed to submit pulse:', err);
      // Handle error - could show toast or error state
    }
  };

  const handleRetakePulse = () => {
    setViewState('survey');
    setCompletedEntry(null);
  };

  const handleViewHistory = () => {
    // Could navigate to history page or show modal
    console.log('View history clicked');
  };

  const handleBackToJournal = () => {
    router.push('/');
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading your pulse data...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center">
        <div className="text-center max-w-md mx-auto p-6">
          <div className="text-red-500 mb-4">
            <Zap size={48} className="mx-auto" />
          </div>
          <h2 className="text-xl font-semibold text-gray-900 mb-2">
            Something went wrong
          </h2>
          <p className="text-gray-600 mb-4">{error}</p>
          <button
            onClick={refreshData}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
          >
            Try Again
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100">
      {/* Header */}
      <header className="bg-white shadow-sm border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <button
              onClick={handleBackToJournal}
              className="flex items-center gap-2 text-gray-600 hover:text-gray-900 transition-colors"
            >
              <ArrowLeft size={20} />
              Back to Journal
            </button>
            
            <div className="flex items-center gap-3">
              <Zap className="text-blue-600" size={24} />
              <h1 className="text-xl font-semibold text-gray-900">
                Leadership Pulse
              </h1>
            </div>
            
            <div className="w-20" /> {/* Spacer for center alignment */}
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="py-8">
        <AnimatePresence mode="wait">
          {viewState === 'welcome' && (
            <motion.div
              key="welcome"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              className="max-w-4xl mx-auto px-4"
            >
              <WelcomeView onStart={handleStartSurvey} />
            </motion.div>
          )}

          {viewState === 'survey' && (
            <motion.div
              key="survey"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
            >
              <PulseSurvey
                onComplete={handleSurveyComplete}
                onProgress={setSurveyProgress}
              />
            </motion.div>
          )}

          {viewState === 'results' && completedEntry && (
            <motion.div
              key="results"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
            >
              <PulseResults
                pulseEntry={completedEntry}
                onStartNew={handleRetakePulse}
                onViewHistory={handleViewHistory}
                recentEntries={pulseData?.recentEntries || []}
              />
            </motion.div>
          )}
        </AnimatePresence>
      </main>
    </div>
  );
}

// Welcome screen component
function WelcomeView({ onStart }: { onStart: () => void }) {
  return (
    <div className="text-center py-12">
      <motion.div
        initial={{ scale: 0.8, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={{ duration: 0.5 }}
        className="mb-8"
      >
        <LeadershipRing 
          scores={{ mood: 0, stress: 0, selfEfficacy: 0 }} 
          animated={false}
          size={200}
        />
      </motion.div>

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2 }}
        className="max-w-2xl mx-auto mb-8"
      >
        <h1 className="text-4xl font-bold text-gray-900 mb-4">
          Start Your Leadership Pulse
        </h1>
        <p className="text-xl text-gray-600 mb-6">
          Take 60 seconds to check in with yourself across three key leadership dimensions: 
          mood, stress resilience, and confidence.
        </p>
        <div className="bg-white rounded-lg p-6 shadow-lg border border-gray-100 mb-8">
          <h3 className="font-semibold text-gray-900 mb-3">What you&apos;ll get:</h3>
          <ul className="text-left space-y-2 text-gray-600">
            <li className="flex items-center gap-3">
              <span className="w-2 h-2 bg-blue-500 rounded-full"></span>
              Real-time visualization of your leadership state
            </li>
            <li className="flex items-center gap-3">
              <span className="w-2 h-2 bg-blue-500 rounded-full"></span>
              Personalized tips based on your responses
            </li>
            <li className="flex items-center gap-3">
              <span className="w-2 h-2 bg-blue-500 rounded-full"></span>
              Track patterns and trends over time
            </li>
          </ul>
        </div>
      </motion.div>

      <motion.button
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.4 }}
        onClick={onStart}
        className="px-8 py-4 bg-blue-600 text-white rounded-xl text-lg font-semibold hover:bg-blue-700 transition-colors shadow-lg hover:shadow-xl"
        whileHover={{ scale: 1.02 }}
        whileTap={{ scale: 0.98 }}
      >
        Begin Pulse Check
      </motion.button>

      <p className="text-sm text-gray-500 mt-4">
        Takes less than 60 seconds
      </p>
    </div>
  );
}