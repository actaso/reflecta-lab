import { PulseEntry, PulseQuestion, PulseTip } from '../types/journal';

// Research-backed pulse questions
export const PULSE_QUESTIONS: PulseQuestion[] = [
  {
    id: 'moodPA',
    category: 'mood',
    question: 'How enthusiastic are you feeling right now?',
    scale: { min: 0, max: 10 }
  },
  {
    id: 'moodNA', 
    category: 'mood',
    question: 'How distressed are you feeling right now?',
    scale: { min: 0, max: 10 }
  },
  {
    id: 'stress1',
    category: 'stress', 
    question: 'How overwhelmed do you feel today?',
    scale: { min: 0, max: 4, labels: [
      { value: 0, label: 'Never' },
      { value: 1, label: 'Almost Never' },
      { value: 2, label: 'Sometimes' },
      { value: 3, label: 'Fairly Often' },
      { value: 4, label: 'Very Often' }
    ]}
  },
  {
    id: 'stress2',
    category: 'stress',
    question: 'How unable to control important things do you feel?',
    scale: { min: 0, max: 4, labels: [
      { value: 0, label: 'Never' },
      { value: 1, label: 'Almost Never' },
      { value: 2, label: 'Sometimes' },
      { value: 3, label: 'Fairly Often' },
      { value: 4, label: 'Very Often' }
    ]}
  },
  {
    id: 'selfEfficacy',
    category: 'selfEfficacy',
    question: 'How confident are you to handle today\'s challenges?',
    scale: { min: 0, max: 10 }
  }
];

// Tips for improving low scores
export const PULSE_TIPS: PulseTip[] = [
  {
    category: 'mood',
    threshold: 40,
    title: 'Boost Your Energy',
    description: 'Your mood could use a lift',
    actionable: 'Try a 2-minute walk outside or listen to your favorite song'
  },
  {
    category: 'stress', 
    threshold: 60,
    title: 'Stress Relief',
    description: 'You\'re feeling overwhelmed',
    actionable: 'Take 3 deep breaths or try a 2-minute meditation'
  },
  {
    category: 'selfEfficacy',
    threshold: 50,
    title: 'Build Confidence',
    description: 'Feeling uncertain about today\'s challenges',
    actionable: 'Break down one big task into 3 smaller, manageable steps'
  }
];

/**
 * Compute normalized scores (0-100) from raw pulse responses
 */
export function computePulseScores(rawResponses: {
  moodPA: number;
  moodNA: number; 
  stress1: number;
  stress2: number;
  selfEfficacy: number;
}): { mood: number; stress: number; selfEfficacy: number } {
  
  // Mood: Combine positive and negative affect (reverse negative)
  // Higher PA and lower NA = better mood
  const moodScore = Math.round(
    ((rawResponses.moodPA / 10) * 50) + // Positive affect contributes 50%
    ((1 - rawResponses.moodNA / 10) * 50) // Inverted negative affect contributes 50%
  );
  
  // Stress: Average the two stress items (reverse scale - lower stress = higher score)
  // PSS scale is 0-4, we invert it so lower stress = higher score
  const avgStress = (rawResponses.stress1 + rawResponses.stress2) / 2;
  const stressScore = Math.round((1 - avgStress / 4) * 100);
  
  // Self-Efficacy: Direct mapping from 0-10 to 0-100
  const selfEfficacyScore = Math.round((rawResponses.selfEfficacy / 10) * 100);
  
  return {
    mood: Math.max(0, Math.min(100, moodScore)),
    stress: Math.max(0, Math.min(100, stressScore)), 
    selfEfficacy: Math.max(0, Math.min(100, selfEfficacyScore))
  };
}

/**
 * Get tips for low scores
 */
export function getTipsForScores(scores: { mood: number; stress: number; selfEfficacy: number }): PulseTip[] {
  const tips: PulseTip[] = [];
  
  PULSE_TIPS.forEach(tip => {
    const categoryScore = scores[tip.category];
    if (categoryScore < tip.threshold) {
      tips.push(tip);
    }
  });
  
  return tips;
}

/**
 * Format date as YYYY-MM-DD for consistent date keys
 */
export function formatPulseDate(date: Date = new Date()): string {
  return date.toISOString().split('T')[0];
}

/**
 * Check if user has completed pulse for today
 */
export function hasPulseForToday(pulseEntries: PulseEntry[]): boolean {
  const today = formatPulseDate();
  return pulseEntries.some(entry => entry.date === today);
}