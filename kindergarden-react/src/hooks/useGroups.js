import { useState, useEffect } from 'react';
import api from '../services/api';

export const useGroups = () => {
  const [groups, setGroups] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const loadGroups = async () => {
      try {
        const data = await api.getGroups();
        setGroups(data || []);
      } catch (err) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };
    loadGroups();
  }, []);

  return { groups, loading, error };
};
