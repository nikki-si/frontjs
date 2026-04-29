import { useState } from 'react';
import { RegisterForm } from './RegisterForm';
import { LoginForm } from './LoginForm';
import { Notification } from '../Common/Notification';
import { CloudBackground } from '../Common/CloudBackground';
import { useAuth } from '../../hooks/useAuth';

export const AuthPage = () => {
  const [isLogin, setIsLogin] = useState(false);
  const [notification, setNotification] = useState(null);
  const { register, login, loading } = useAuth();

  const showNotification = (message, type = 'info') => {
    setNotification({ message, type });
  };

  const handleRegister = async (formData) => {
    const result = await register(
      formData.email,
      formData.password,
      formData.fullName,
      formData.role
    );
    
    if (result.success) {
      showNotification('✅ Заявка отправлена! После подтверждения администратором вы сможете войти.', 'success');
      setTimeout(() => setIsLogin(true), 3000);
    } else {
      showNotification(result.error, 'error');
    }
  };

  const handleLogin = async (formData) => {
    const result = await login(formData.email, formData.password);
    
    if (result.success) {
      showNotification('Вход выполнен успешно!', 'success');
      
      setTimeout(() => {
        const role = result.user.role;
        switch(role) {
          case 'admin':
            window.location.href = '/admin';
            break;
          case 'teacher':
            window.location.href = '/teacher';
            break;
          case 'accountant':
            window.location.href = '/accountant';
            break;
          default:
            showNotification('Неизвестная роль пользователя', 'error');
        }
      }, 500);
    } else {
      showNotification(result.error, 'error');
    }
  };

  return (
    <div className="auth-page">
      <CloudBackground />
      
      <div className="auth-container">
        <div className="auth-card">
          {isLogin ? (
            <LoginForm 
              onSubmit={handleLogin}
              loading={loading}
              onSwitchToRegister={() => setIsLogin(false)}
            />
          ) : (
            <RegisterForm 
              onSubmit={handleRegister}
              loading={loading}
              onSwitchToLogin={() => setIsLogin(true)}
            />
          )}
        </div>
      </div>

      {notification && (
        <Notification
          message={notification.message}
          type={notification.type}
          onClose={() => setNotification(null)}
        />
      )}
    </div>
  );
};
