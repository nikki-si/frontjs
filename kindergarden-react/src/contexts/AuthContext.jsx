import React, { createContext, useState, useContext, useEffect } from 'react';
import api from '../services/api';

const AuthContext = createContext();

export const useAuth = () => useContext(AuthContext);

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [token, setToken] = useState(localStorage.getItem('jwt_token'));

  useEffect(() => {
    const storedToken = localStorage.getItem('jwt_token');
    const storedRole = localStorage.getItem('userRole');
    const storedName = localStorage.getItem('userName');
    const storedEmail = localStorage.getItem('userEmail');
    
    if (storedToken && storedRole) {
      setUser({
        role: storedRole,
        name: storedName,
        email: storedEmail
      });
      setToken(storedToken);
    }
    setLoading(false);
  }, []);

  const login = async (email, password) => {
    await api.loginUser(email, password);
    const role = localStorage.getItem('userRole');
    const name = localStorage.getItem('userName');
    
    setUser({ role, name, email });
    setToken(localStorage.getItem('jwt_token'));
    
    return { success: true, role };
  };

  const logout = () => {
    const farewell = document.createElement('div');
    farewell.style.cssText = `
      position: fixed;
      top: 20px;
      right: 20px;
      padding: 15px 25px;
      background: #48bb78;
      color: white;
      border-radius: 10px;
      box-shadow: 0 4px 15px rgba(0,0,0,0.2);
      z-index: 9999;
      animation: slideIn 0.3s ease;
    `;
    farewell.textContent = '👋 До свидания!';
    document.body.appendChild(farewell);
    
    setTimeout(() => {
      farewell.style.animation = 'slideOut 0.3s ease';
      setTimeout(() => farewell.remove(), 300);
    }, 2000);
    
    api.logoutUser();
    setUser(null);
    setToken(null);
    
    setTimeout(() => {
      window.location.href = '/login';
    }, 1000);
  };

  const isAuthenticated = !!user && !!token;
  
  const hasRole = (requiredRole) => {
    if (!user) return false;
    const userRole = user.role?.toLowerCase();
    const roleMap = {
      'admin': ['admin'],
      'teacher': ['admin', 'teacher'],
      'accountant': ['admin', 'accountant']
    };
    return roleMap[requiredRole]?.includes(userRole) || false;
  };

  return (
    <AuthContext.Provider value={{ user, login, logout, loading, isAuthenticated, hasRole, token }}>
      {children}
    </AuthContext.Provider>
  );
};
