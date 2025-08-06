'use client';

import { useState, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { PULSE_QUESTIONS } from '../utils/pulseScoring';
import { PulseQuestion } from '../types/journal';

interface PulseSurveyProps {
  onComplete: (responses: {
    moodPA: number;
    moodNA: number;
    stress1: number;
    stress2: number;
    selfEfficacy: number;
  }) => void;
  onProgress?: (current: number, total: number) => void;
}

export default function PulseSurvey({ onComplete, onProgress }: PulseSurveyProps) {
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [responses, setResponses] = useState<{ [key: string]: number }>({});
  const [isSubmitting, setIsSubmitting] = useState(false);

  const questions = PULSE_QUESTIONS;
  const currentQuestion = questions[currentQuestionIndex];
  const isLastQuestion = currentQuestionIndex === questions.length - 1;
  const hasAnswered = responses[currentQuestion.id] !== undefined;

  const handleResponse = useCallback((value: number) => {
    const newResponses = { ...responses, [currentQuestion.id]: value };
    setResponses(newResponses);
    
    // Auto-advance after a short delay
    setTimeout(() => {
      if (isLastQuestion) {
        // Submit responses
        setIsSubmitting(true);
        onComplete({
          moodPA: newResponses.moodPA,
          moodNA: newResponses.moodNA,
          stress1: newResponses.stress1,
          stress2: newResponses.stress2,
          selfEfficacy: newResponses.selfEfficacy
        });
      } else {
        setCurrentQuestionIndex(prev => prev + 1);
        onProgress?.(currentQuestionIndex + 2, questions.length);
      }
    }, 500);
  }, [currentQuestion.id, responses, isLastQuestion, currentQuestionIndex, onComplete, onProgress, questions.length]);

  const goToPrevious = () => {
    if (currentQuestionIndex > 0) {
      setCurrentQuestionIndex(prev => prev - 1);
      onProgress?.(currentQuestionIndex, questions.length);
    }
  };

  const goToNext = () => {
    if (currentQuestionIndex < questions.length - 1 && hasAnswered) {
      setCurrentQuestionIndex(prev => prev + 1);
      onProgress?.(currentQuestionIndex + 2, questions.length);
    }
  };

  const renderScaleButtons = (question: PulseQuestion) => {
    const { scale } = question;
    const buttons = [];
    
    for (let i = scale.min; i <= scale.max; i++) {
      const isSelected = responses[question.id] === i;
      const label = scale.labels?.find(l => l.value === i)?.label || i.toString();
      
      buttons.push(
        <motion.button
          key={i}
          onClick={() => handleResponse(i)}
          className={`
            px-4 py-3 rounded-lg border-2 transition-all duration-200 min-w-[80px]
            ${isSelected 
              ? 'border-blue-500 bg-blue-50 text-blue-700 shadow-md' 
              : 'border-gray-200 bg-white text-gray-700 hover:border-gray-300 hover:shadow-sm'
            }
          `}
          whileHover={{ scale: 1.02 }}
          whileTap={{ scale: 0.98 }}
          disabled={isSubmitting}
        >
          <div className="text-center">
            <div className="font-semibold">{i}</div>
            {scale.labels && (
              <div className="text-xs mt-1 opacity-75">
                {label}
              </div>
            )}
          </div>
        </motion.button>
      );
    }
    
    return buttons;
  };

  return (
    <div className="max-w-2xl mx-auto p-6">
      {/* Progress bar */}
      <div className="mb-8">
        <div className="flex justify-between text-sm text-gray-500 mb-2">
          <span>Question {currentQuestionIndex + 1} of {questions.length}</span>
          <span>{Math.round(((currentQuestionIndex + 1) / questions.length) * 100)}%</span>
        </div>
        <div className="w-full bg-gray-200 rounded-full h-2">
          <motion.div 
            className="bg-blue-500 h-2 rounded-full"
            initial={{ width: 0 }}
            animate={{ width: `${((currentQuestionIndex + 1) / questions.length) * 100}%` }}
            transition={{ duration: 0.3 }}
          />
        </div>
      </div>

      {/* Question cards */}
      <AnimatePresence mode="wait">
        <motion.div
          key={currentQuestionIndex}
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          exit={{ opacity: 0, x: -20 }}
          transition={{ duration: 0.3 }}
          className="bg-white rounded-xl shadow-lg border border-gray-100 p-8"
        >
          {/* Category badge */}
          <div className="mb-4">
            <span className={`
              inline-block px-3 py-1 rounded-full text-xs font-medium uppercase tracking-wide
              ${currentQuestion.category === 'mood' ? 'bg-green-100 text-green-700' : ''}
              ${currentQuestion.category === 'stress' ? 'bg-red-100 text-red-700' : ''}
              ${currentQuestion.category === 'selfEfficacy' ? 'bg-blue-100 text-blue-700' : ''}
            `}>
              {currentQuestion.category === 'mood' && 'Mood'}
              {currentQuestion.category === 'stress' && 'Stress'}
              {currentQuestion.category === 'selfEfficacy' && 'Confidence'}
            </span>
          </div>

          {/* Question */}
          <h2 className="text-2xl font-bold text-gray-900 mb-8 leading-relaxed">
            {currentQuestion.question}
          </h2>

          {/* Scale */}
          <div className="mb-8">
            <div className="flex flex-wrap gap-3 justify-center">
              {renderScaleButtons(currentQuestion)}
            </div>
            
            {/* Scale labels */}
            {!currentQuestion.scale.labels && (
              <div className="flex justify-between text-sm text-gray-500 mt-4 px-4">
                <span>Not at all</span>
                <span>Extremely</span>
              </div>
            )}
          </div>

          {/* Navigation */}
          <div className="flex justify-between items-center">
            <button
              onClick={goToPrevious}
              disabled={currentQuestionIndex === 0 || isSubmitting}
              className="flex items-center gap-2 px-4 py-2 text-gray-600 hover:text-gray-800 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <ChevronLeft size={20} />
              Previous
            </button>

            {hasAnswered && !isLastQuestion && (
              <button
                onClick={goToNext}
                disabled={isSubmitting}
                className="flex items-center gap-2 px-6 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 disabled:opacity-50"
              >
                Next
                <ChevronRight size={20} />
              </button>
            )}

            {isSubmitting && (
              <div className="flex items-center gap-2 text-blue-600">
                <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-blue-600"></div>
                Submitting...
              </div>
            )}
          </div>
        </motion.div>
      </AnimatePresence>

      {/* Instructions */}
      <div className="mt-6 text-center text-sm text-gray-500">
        Select your response to continue
      </div>
    </div>
  );
}