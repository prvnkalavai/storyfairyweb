import { useState, useCallback } from 'react';
import { getUserCredits, deductCredits } from '../services/creditService';

export const useCredits = () => {
  const [credits, setCredits] = useState<number | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchCredits = useCallback(async () => {
      try {
          setLoading(true);
          setError(null);
          const userCredits = await getUserCredits();
          setCredits(userCredits);
      } catch (err) {
          setError(err instanceof Error ? err.message : 'Failed to fetch credits');
      } finally {
          setLoading(false);
      }
  }, []);

  const deduct = useCallback(async (amount: number, description: string) => {
      try {
          setLoading(true);
          setError(null);
          const newBalance = await deductCredits(amount, description);
          setCredits(newBalance);
          return true;
      } catch (err) {
          setError(err instanceof Error ? err.message : 'Failed to deduct credits');
          return false;
      } finally {
          setLoading(false);
      }
  }, []);

  return {
      credits,
      loading,
      error,
      fetchCredits,
      deduct
  };
};