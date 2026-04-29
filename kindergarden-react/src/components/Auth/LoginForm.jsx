// src/components/Auth/LoginForm.jsx
import { useState } from 'react';

export const LoginForm = ({ onSubmit, loading, onSwitchToRegister }) => {
  const [formData, setFormData] = useState({
    email: '',
    password: ''
  });
  const [errors, setErrors] = useState({});

  const validate = () => {
    const newErrors = {};
    if (!formData.email) newErrors.email = 'Email обязателен';
    if (!formData.password) newErrors.password = 'Пароль обязателен';
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (validate()) {
      onSubmit(formData);
    }
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
    if (errors[name]) {
      setErrors(prev => ({ ...prev, [name]: '' }));
    }
  };

  return (
    <div id="loginForm">
      <h1>🔐 Вход 🔐</h1>
      <p className="subtitle">Введите ваш email и пароль для входа</p>
      
      <form onSubmit={handleSubmit}>
        <div className="form-group">
          <input
            type="email"
            name="email"
            value={formData.email}
            onChange={handleChange}
            placeholder="email@domain.com"
            className={errors.email ? 'error' : ''}
            disabled={loading}
          />
          {errors.email && <small className="error-text">{errors.email}</small>}
        </div>
        
        <div className="form-group">
          <input
            type="password"
            name="password"
            value={formData.password}
            onChange={handleChange}
            placeholder="Пароль"
            className={errors.password ? 'error' : ''}
            disabled={loading}
          />
          {errors.password && <small className="error-text">{errors.password}</small>}
        </div>
        
        <button type="submit" className="btn-primary" disabled={loading}>
          {loading ? 'Вход...' : 'Войти'}
        </button>
      </form>
      
      <div className="auth-footer">
        <p>Нет аккаунта? <a href="#" onClick={onSwitchToRegister}>Зарегистрироваться</a></p>
        <p className="copyright">© Все права защищены</p>
      </div>
    </div>
  );
};