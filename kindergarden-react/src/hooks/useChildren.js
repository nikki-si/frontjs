import { useState, useEffect, useCallback } from 'react';
import api from '../services/api';

export const useChildren = (groupId) => {
  const [children, setChildren] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const loadChildren = useCallback(async () => {
    if (!groupId) {
      setChildren([]);
      setLoading(false);
      return;
    }
    
    setLoading(true);
    try {
      const data = await api.getChildrenByGroup(groupId);
      setChildren(data || []);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, [groupId]);

  useEffect(() => {
    loadChildren();
  }, [loadChildren]);

  return { children, loading, error, reload: loadChildren };
};
