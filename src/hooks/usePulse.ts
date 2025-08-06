'use client';

import { useState, useEffect } from 'react';
import { PulseEntry } from '../types/journal';

interface PulseData {
  todayEntry: PulseEntry | null;
  recentEntries: PulseEntry[];
  hasCompletedToday: boolean;
}

interface PulseResponse {
  moodPA: number;
  moodNA: number;
  stress1: number;
  stress2: number;
  selfEfficacy: number;
}

interface UsePulseReturn {
  pulseData: PulseData | null;
  loading: boolean;
  error: string | null;
  submitPulse: (responses: PulseResponse) => Promise<PulseEntry>;
  refreshData: () => Promise<void>;
}

export function usePulse(): UsePulseReturn {
  const [pulseData, setPulseData] = useState<PulseData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchPulseData = async () => {
    try {
      setLoading(true);
      setError(null);

      const response = await fetch('/api/pulse/latest');
      if (!response.ok) {
        throw new Error('Failed to fetch pulse data');
      }

      const data = await response.json();
      if (data.success) {
        setPulseData({
          todayEntry: data.todayEntry,
          recentEntries: data.recentEntries || [],
          hasCompletedToday: data.hasCompletedToday
        });
      } else {
        throw new Error(data.error || 'Failed to fetch pulse data');
      }
    } catch (err) {
      console.error('Error fetching pulse data:', err);
      setError(err instanceof Error ? err.message : 'An error occurred');
    } finally {
      setLoading(false);
    }
  };

  const submitPulse = async (responses: PulseResponse): Promise<PulseEntry> => {
    try {
      setError(null);

      const response = await fetch('/api/pulse/submit', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(responses),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to submit pulse');
      }

      const data = await response.json();
      if (data.success) {
        // Update local state with new entry
        setPulseData(prev => prev ? {
          ...prev,
          todayEntry: data.pulseEntry,
          hasCompletedToday: true
        } : null);
        
        return data.pulseEntry;
      } else {
        throw new Error(data.error || 'Failed to submit pulse');
      }
    } catch (err) {
      console.error('Error submitting pulse:', err);
      const errorMessage = err instanceof Error ? err.message : 'An error occurred';
      setError(errorMessage);
      throw new Error(errorMessage);
    }
  };

  const refreshData = async () => {
    await fetchPulseData();
  };

  useEffect(() => {
    fetchPulseData();
  }, []);

  return {
    pulseData,
    loading,
    error,
    submitPulse,
    refreshData
  };
}