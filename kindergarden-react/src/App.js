import React from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from './contexts/AuthContext';
import { ProtectedRoute } from './components/Common/ProtectedRoute';
import { AuthPage } from './components/Auth/AuthPage';
import { AdminPage } from './components/Admin/AdminPage';
import { TeacherPage } from './components/Teacher/TeacherPage';
import { AccountantPage } from './components/Accountant/AccountantPage';
import './style.css';

function App() {
  return (
    <AuthProvider>
      <Routes>
        <Route path="/login" element={<AuthPage />} />
        <Route path="/" element={<Navigate to="/login" replace />} />
        
        <Route 
          path="/admin" 
          element={
            <ProtectedRoute requiredRole="admin">
              <AdminPage />
            </ProtectedRoute>
          } 
        />
        
        <Route 
          path="/teacher" 
          element={
            <ProtectedRoute requiredRole="teacher">
              <TeacherPage />
            </ProtectedRoute>
          } 
        />
        
        <Route 
          path="/accountant" 
          element={
            <ProtectedRoute requiredRole="accountant">
              <AccountantPage />
            </ProtectedRoute>
          } 
        />
        
        <Route path="*" element={<Navigate to="/login" replace />} />
      </Routes>
    </AuthProvider>
  );
}

export default App;
