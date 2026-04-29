import { useState, useCallback } from 'react';
import api from '../services/api';

export const useAuth = () => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const register = useCallback(async (email, password, fullName, role) => {
    setLoading(true);
    setError(null);
    try {
      const result = await api.registerUser(email, password, fullName, role);
      return { success: true, data: result };
    } catch (err) {
      const errorMessage = err.message === 'SERVER_UNREACHABLE' 
        ? 'Ошибка подключения к серверу' 
        : err.message;
      setError(errorMessage);
      return { success: false, error: errorMessage };
    } finally {
      setLoading(false);
    }
  }, []);

  const login = useCallback(async (email, password) => {
    setLoading(true);
    setError(null);
    try {
      const result = await api.loginUser(email, password);
      
      const role = localStorage.getItem('userRole');
      const userName = localStorage.getItem('userName');
      
      return { 
        success: true, 
        data: result,
        user: { role, email, name: userName }
      };
    } catch (err) {
      const errorMessage = err.message === 'SERVER_UNREACHABLE'
        ? 'Ошибка подключения к серверу'
        : err.message;
      setError(errorMessage);
      return { success: false, error: errorMessage };
    } finally {
      setLoading(false);
    }
  }, []);

  const logout = useCallback(() => {
    api.logoutUser();
  }, []);

  const isAuthenticated = useCallback(() => {
    return !!localStorage.getItem('jwt_token');
  }, []);

  const getUserRole = useCallback(() => {
    return localStorage.getItem('userRole');
  }, []);

  return {
    register,
    login,
    logout,
    loading,
    error,
    isAuthenticated,
    getUserRole
  };
};
