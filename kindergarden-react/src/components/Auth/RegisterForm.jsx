// src/components/Auth/RegisterForm.jsx
import { useState } from 'react';

export const RegisterForm = ({ onSubmit, loading, onSwitchToLogin }) => {
  const [formData, setFormData] = useState({
    email: '',
    password: '',
    fullName: '',
    role: ''
  });
  const [errors, setErrors] = useState({});

  const validate = () => {
    const newErrors = {};
    if (!formData.email) newErrors.email = 'Email обязателен';
    else if (!/\S+@\S+\.\S+/.test(formData.email)) newErrors.email = 'Неверный формат email';
    
    if (!formData.password) newErrors.password = 'Пароль обязателен';
    else if (formData.password.length < 6) newErrors.password = 'Пароль должен быть не менее 6 символов';
    
    if (!formData.fullName) newErrors.fullName = 'ФИО обязательно';
    
    if (!formData.role) newErrors.role = 'Выберите роль';
    
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
    <div id="registerForm">
      <h1>🌸 Регистрация 🌸</h1>
      <p className="subtitle">Заполните форму, чтобы отправить заявку</p>
      
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
        
        <div className="form-group">
          <input
            type="text"
            name="fullName"
            value={formData.fullName}
            onChange={handleChange}
            placeholder="Ваше ФИО"
            className={errors.fullName ? 'error' : ''}
            disabled={loading}
          />
          {errors.fullName && <small className="error-text">{errors.fullName}</small>}
        </div>
        
        <div className="form-group">
          <select
            name="role"
            value={formData.role}
            onChange={handleChange}
            className={errors.role ? 'error' : ''}
            disabled={loading}
          >
            <option value="">Выберите роль</option>
            <option value="TEACHER">👨‍🏫 Воспитатель</option>
            <option value="ACCOUNTANT">💰 Бухгалтер</option>
          </select>
          <small style={{ color: '#718096', display: 'block', marginTop: '5px' }}>
            После регистрации администратор должен подтвердить ваш аккаунт
          </small>
          {errors.role && <small className="error-text">{errors.role}</small>}
        </div>
        
        <button type="submit" className="btn-primary" disabled={loading}>
          {loading ? 'Отправка...' : 'Отправить заявку'}
        </button>
      </form>
      
      <div className="auth-footer">
        <p>Уже есть аккаунт? <a href="#" onClick={onSwitchToLogin}>Войти</a></p>
        <p className="copyright">© Все права защищены</p>
      </div>
    </div>
  );
};