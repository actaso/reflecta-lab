'use client';

import { motion } from 'framer-motion';
import { TrendingUp, Lightbulb, RotateCcw, Calendar } from 'lucide-react';
import LeadershipRing from './LeadershipRing';
import { getTipsForScores } from '../utils/pulseScoring';
import { PulseEntry } from '../types/journal';

interface PulseResultsProps {
  pulseEntry: PulseEntry;
  onStartNew?: () => void;
  onViewHistory?: () => void;
  recentEntries?: PulseEntry[];
}

export default function PulseResults({ 
  pulseEntry, 
  onStartNew, 
  onViewHistory,
  recentEntries = []
}: PulseResultsProps) {
  const { computedScores } = pulseEntry;
  const tips = getTipsForScores(computedScores);
  const overallScore = Math.round((computedScores.mood + computedScores.stress + computedScores.selfEfficacy) / 3);

  // Calculate trend from recent entries
  const getTrend = () => {
    if (recentEntries.length < 2) return null;
    
    const previousEntry = recentEntries.find(entry => entry.date !== pulseEntry.date);
    if (!previousEntry) return null;

    const previousOverall = Math.round(
      (previousEntry.computedScores.mood + 
       previousEntry.computedScores.stress + 
       previousEntry.computedScores.selfEfficacy) / 3
    );
    
    const change = overallScore - previousOverall;
    return { change, previous: previousOverall };
  };

  const trend = getTrend();

  const getScoreColor = (score: number) => {
    if (score >= 80) return 'text-green-600';
    if (score >= 60) return 'text-yellow-600';
    return 'text-red-600';
  };

  const getScoreLabel = (score: number) => {
    if (score >= 80) return 'Excellent';
    if (score >= 60) return 'Good';
    if (score >= 40) return 'Fair';
    return 'Needs Attention';
  };

  return (
    <div className="max-w-4xl mx-auto p-6 space-y-8">
      {/* Header */}
      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="text-center"
      >
        <h1 className="text-3xl font-bold text-gray-900 mb-2">
          Your Leadership Pulse
        </h1>
        <p className="text-gray-600">
          {new Date(pulseEntry.timestamp).toLocaleDateString('en-US', {
            weekday: 'long',
            year: 'numeric',
            month: 'long',
            day: 'numeric'
          })}
        </p>
      </motion.div>

      {/* Main Ring and Overall Score */}
      <motion.div 
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ delay: 0.2 }}
        className="bg-white rounded-xl shadow-lg border border-gray-100 p-8"
      >
        <div className="flex flex-col lg:flex-row items-center gap-8">
          <div className="flex-shrink-0">
            <LeadershipRing scores={computedScores} size={240} />
          </div>
          
          <div className="flex-1 text-center lg:text-left space-y-4">
            <div>
              <div className="text-4xl font-bold text-gray-900 mb-2">
                {overallScore}
                <span className="text-xl text-gray-500 ml-1">/100</span>
              </div>
              <div className={`text-lg font-medium ${getScoreColor(overallScore)}`}>
                {getScoreLabel(overallScore)}
              </div>
            </div>

            {trend && (
              <div className="flex items-center justify-center lg:justify-start gap-2">
                <TrendingUp 
                  size={20} 
                  className={trend.change >= 0 ? 'text-green-500' : 'text-red-500'}
                />
                <span className={`text-sm ${trend.change >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                  {trend.change >= 0 ? '+' : ''}{trend.change} from last check
                </span>
              </div>
            )}

            <p className="text-gray-600 max-w-md">
              Your leadership pulse reflects your current state across three key dimensions 
              that drive effective leadership performance.
            </p>
          </div>
        </div>
      </motion.div>

      {/* Detailed Scores */}
      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.4 }}
        className="grid md:grid-cols-3 gap-6"
      >
        {[
          { 
            key: 'mood', 
            label: 'Mood', 
            description: 'Your current emotional state and enthusiasm',
            icon: '😊',
            color: 'green'
          },
          { 
            key: 'stress', 
            label: 'Stress Resilience', 
            description: 'Your ability to manage pressure and overwhelm',
            icon: '🧘',
            color: 'red'
          },
          { 
            key: 'selfEfficacy', 
            label: 'Confidence', 
            description: 'Your belief in handling today\'s challenges',
            icon: '💪',
            color: 'blue'
          }
        ].map((metric) => (
          <div 
            key={metric.key}
            className="bg-white rounded-lg shadow border border-gray-100 p-6"
          >
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-3">
                <span className="text-2xl">{metric.icon}</span>
                <div>
                  <h3 className="font-semibold text-gray-900">{metric.label}</h3>
                  <p className="text-sm text-gray-600">{metric.description}</p>
                </div>
              </div>
            </div>
            
            <div className="flex items-center justify-between">
              <div className={`text-2xl font-bold ${getScoreColor(computedScores[metric.key as keyof typeof computedScores])}`}>
                {computedScores[metric.key as keyof typeof computedScores]}
              </div>
              <div className={`text-sm font-medium ${getScoreColor(computedScores[metric.key as keyof typeof computedScores])}`}>
                {getScoreLabel(computedScores[metric.key as keyof typeof computedScores])}
              </div>
            </div>
          </div>
        ))}
      </motion.div>

      {/* Tips Section */}
      {tips.length > 0 && (
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.6 }}
          className="bg-gradient-to-r from-blue-50 to-indigo-50 rounded-xl p-6 border border-blue-100"
        >
          <div className="flex items-center gap-3 mb-4">
            <Lightbulb className="text-blue-600" size={24} />
            <h3 className="text-lg font-semibold text-blue-900">
              Personalized Tips
            </h3>
          </div>
          
          <div className="space-y-4">
            {tips.map((tip) => (
              <div key={tip.category} className="bg-white rounded-lg p-4 border border-blue-200">
                <h4 className="font-medium text-blue-900 mb-1">{tip.title}</h4>
                <p className="text-blue-700 text-sm mb-2">{tip.description}</p>
                <p className="text-blue-800 font-medium text-sm">
                  💡 {tip.actionable}
                </p>
              </div>
            ))}
          </div>
        </motion.div>
      )}

      {/* Actions */}
      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.8 }}
        className="flex flex-col sm:flex-row gap-4 justify-center"
      >
        {onViewHistory && (
          <button
            onClick={onViewHistory}
            className="flex items-center justify-center gap-2 px-6 py-3 bg-white border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 transition-colors"
          >
            <Calendar size={20} />
            View History
          </button>
        )}
        
        {onStartNew && (
          <button
            onClick={onStartNew}
            className="flex items-center justify-center gap-2 px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
          >
            <RotateCcw size={20} />
            Retake Pulse
          </button>
        )}
      </motion.div>

      {/* Footer */}
      <div className="text-center text-sm text-gray-500 pt-4 border-t border-gray-200">
        <p>
          Your pulse data is encrypted and stored securely. 
          Take your pulse daily for better insights into your leadership patterns.
        </p>
      </div>
    </div>
  );
}