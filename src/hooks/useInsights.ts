import { useState, useEffect } from 'react';
import { FirestoreService } from '@/lib/firestore';
import { useFirebaseAuth } from '@/hooks/useFirebaseAuth';
import { userInsight } from '@/types/insights';

export const useInsights = () => {
  const { user, isAuthenticated } = useFirebaseAuth();
  const [insights, setInsights] = useState<userInsight | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!isAuthenticated || !user?.uid) {
      setInsights(null);
      setLoading(false);
      setError(null);
      return;
    }

    setLoading(true);
    setError(null);

    // Set up real-time listener for insights
    const unsubscribe = FirestoreService.subscribeToUserInsights(
      user.uid,
      (newInsights) => {
        setInsights(newInsights);
        setLoading(false);
      }
    );

    // Cleanup listener on unmount or user change
    return () => {
      unsubscribe();
    };
  }, [isAuthenticated, user?.uid]);

  // Helper function to manually refetch insights
  const refetch = async () => {
    if (!user?.uid) return;

    try {
      setLoading(true);
      setError(null);
      const freshInsights = await FirestoreService.getUserInsights(user.uid);
      setInsights(freshInsights);
    } catch (err) {
      console.error('Error refetching insights:', err);
      setError(err instanceof Error ? err.message : 'Failed to fetch insights');
    } finally {
      setLoading(false);
    }
  };

  return {
    insights,
    loading,
    error,
    refetch,
    hasInsights: insights !== null
  };
};