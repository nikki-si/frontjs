import { useState, useCallback } from 'react';
import api from '../services/api';

export const useAttendance = () => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const markAttendance = useCallback(async (childId, date, status) => {
    setLoading(true);
    try {
      const result = await api.markAttendance(childId, date, status);
      return { success: true, data: result };
    } catch (err) {
      setError(err.message);
      return { success: false, error: err.message };
    } finally {
      setLoading(false);
    }
  }, []);

  return { markAttendance, loading, error };
};
