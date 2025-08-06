'use client';

import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';

interface LeadershipRingProps {
  scores: {
    mood: number;
    stress: number;
    selfEfficacy: number;
  };
  animated?: boolean;
  size?: number;
}

export default function LeadershipRing({ 
  scores, 
  animated = true, 
  size = 200 
}: LeadershipRingProps) {
  const [displayScores, setDisplayScores] = useState(
    animated ? { mood: 0, stress: 0, selfEfficacy: 0 } : scores
  );

  useEffect(() => {
    if (animated) {
      const timer = setTimeout(() => {
        setDisplayScores(scores);
      }, 100);
      return () => clearTimeout(timer);
    }
  }, [scores, animated]);

  const centerX = size / 2;
  const centerY = size / 2;
  const radius = size * 0.35;
  const strokeWidth = size * 0.08;

  // Calculate circumference for each segment (120 degrees each)
  const segmentLength = (2 * Math.PI * radius) / 3;
  
  // Calculate stroke dash array for each score
  const getMoodStroke = (score: number) => {
    const progress = score / 100;
    const strokeLength = segmentLength * progress;
    return `${strokeLength} ${segmentLength - strokeLength}`;
  };

  // Colors for each metric
  const colors = {
    mood: '#10B981', // Green
    stress: '#EF4444', // Red  
    selfEfficacy: '#3B82F6' // Blue
  };

  // Starting angles for each segment (in degrees)
  const startAngles = {
    mood: -90, // Top
    stress: 30, // Bottom right
    selfEfficacy: 150 // Bottom left
  };

  const getRotation = (metric: keyof typeof startAngles) => 
    `rotate(${startAngles[metric]} ${centerX} ${centerY})`;

  return (
    <div className="flex flex-col items-center space-y-4">
      <div className="relative">
        <svg 
          width={size} 
          height={size} 
          className="transform -rotate-90"
        >
          {/* Background rings */}
          {['mood', 'stress', 'selfEfficacy'].map((metric, index) => (
            <circle
              key={`bg-${metric}`}
              cx={centerX}
              cy={centerY}
              r={radius}
              fill="none"
              stroke="#e5e7eb"
              strokeWidth={strokeWidth}
              strokeDasharray={`${segmentLength} ${segmentLength * 2}`}
              strokeDashoffset={-index * segmentLength}
              transform={getRotation(metric as keyof typeof startAngles)}
              className="opacity-20"
            />
          ))}

          {/* Progress rings */}
          <motion.circle
            cx={centerX}
            cy={centerY}
            r={radius}
            fill="none"
            stroke={colors.mood}
            strokeWidth={strokeWidth}
            strokeLinecap="round"
            strokeDasharray={getMoodStroke(displayScores.mood)}
            strokeDashoffset={0}
            transform={getRotation('mood')}
            initial={animated ? { strokeDasharray: getMoodStroke(0) } : undefined}
            animate={{ strokeDasharray: getMoodStroke(displayScores.mood) }}
            transition={{ duration: 1, ease: "easeOut" }}
          />

          <motion.circle
            cx={centerX}
            cy={centerY}
            r={radius}
            fill="none"
            stroke={colors.stress}
            strokeWidth={strokeWidth}
            strokeLinecap="round"
            strokeDasharray={getMoodStroke(displayScores.stress)}
            strokeDashoffset={-segmentLength}
            transform={getRotation('stress')}
            initial={animated ? { strokeDasharray: getMoodStroke(0) } : undefined}
            animate={{ strokeDasharray: getMoodStroke(displayScores.stress) }}
            transition={{ duration: 1, ease: "easeOut", delay: 0.2 }}
          />

          <motion.circle
            cx={centerX}
            cy={centerY}
            r={radius}
            fill="none"
            stroke={colors.selfEfficacy}
            strokeWidth={strokeWidth}
            strokeLinecap="round"
            strokeDasharray={getMoodStroke(displayScores.selfEfficacy)}
            strokeDashoffset={-segmentLength * 2}
            transform={getRotation('selfEfficacy')}
            initial={animated ? { strokeDasharray: getMoodStroke(0) } : undefined}
            animate={{ strokeDasharray: getMoodStroke(displayScores.selfEfficacy) }}
            transition={{ duration: 1, ease: "easeOut", delay: 0.4 }}
          />

          {/* Center circle */}
          <circle
            cx={centerX}
            cy={centerY}
            r={radius * 0.3}
            fill="white"
            stroke="#e5e7eb"
            strokeWidth={2}
          />
        </svg>

        {/* Center content */}
        <div className="absolute inset-0 flex items-center justify-center">
          <div className="text-center">
            <div className="text-lg font-bold text-gray-900">
              {Math.round((displayScores.mood + displayScores.stress + displayScores.selfEfficacy) / 3)}
            </div>
            <div className="text-xs text-gray-500">Overall</div>
          </div>
        </div>
      </div>

      {/* Legend */}
      <div className="flex flex-wrap justify-center gap-4 text-sm">
        <div className="flex items-center gap-2">
          <div 
            className="w-3 h-3 rounded-full" 
            style={{ backgroundColor: colors.mood }}
          />
          <span className="text-gray-700">
            Mood ({displayScores.mood})
          </span>
        </div>
        <div className="flex items-center gap-2">
          <div 
            className="w-3 h-3 rounded-full" 
            style={{ backgroundColor: colors.stress }}
          />
          <span className="text-gray-700">
            Stress Resilience ({displayScores.stress})
          </span>
        </div>
        <div className="flex items-center gap-2">
          <div 
            className="w-3 h-3 rounded-full" 
            style={{ backgroundColor: colors.selfEfficacy }}
          />
          <span className="text-gray-700">
            Confidence ({displayScores.selfEfficacy})
          </span>
        </div>
      </div>
    </div>
  );
}