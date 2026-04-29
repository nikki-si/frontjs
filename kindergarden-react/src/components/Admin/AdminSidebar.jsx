// src/components/Admin/AdminSidebar.jsx
import React from 'react';

const AdminSidebar = ({ activeSection, onSectionChange, onLogout, pendingCount }) => {
  const navItems = [
    { id: 'attendance', icon: '📊', label: 'Посещаемость' },
    { id: 'users', icon: '👥', label: 'Пользователи' },
    { id: 'pending', icon: '📝', label: 'Заявки', badge: pendingCount },
    { id: 'reports', icon: '📄', label: 'Отчёты' },
    { id: 'statistics', icon: '📈', label: 'Статистика' },
    { id: 'settings', icon: '⚙️', label: 'Настройки' }
  ];

  return (
    <aside className="sidebar">
      <div className="sidebar-header">
        <div className="logo">☁️</div>
        <h2>Админ-панель</h2>
      </div>
      <nav className="sidebar-nav">
        {navItems.map(item => (
          <a
            key={item.id}
            href="#"
            className={`nav-item ${activeSection === item.id ? 'active' : ''}`}
            onClick={(e) => { e.preventDefault(); onSectionChange(item.id); }}
          >
            <span className="nav-icon">{item.icon}</span>
            <span>{item.label}</span>
            {item.badge > 0 && (
              <span className="badge" style={{ background: '#f56565', color: 'white', borderRadius: '50%', padding: '2px 8px', fontSize: '12px', marginLeft: '8px' }}>
                {item.badge}
              </span>
            )}
          </a>
        ))}
        <a href="#" className="nav-item" onClick={(e) => { e.preventDefault(); onLogout(); }}>
          <span className="nav-icon">🚪</span>
          <span>Выйти</span>
        </a>
      </nav>
    </aside>
  );
};

export default AdminSidebar;