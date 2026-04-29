import React, { useState, useEffect, useCallback } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { CloudBackground } from '../Common/CloudBackground';
import { Notification } from '../Common/Notification';
import api from '../../services/api';

export const AdminPage = () => {
  const { user, logout } = useAuth();
  const [activeSection, setActiveSection] = useState('attendance');
  const [users, setUsers] = useState([]);
  const [groups, setGroups] = useState([]);
  const [pendingUsers, setPendingUsers] = useState([]);
  const [notification, setNotification] = useState(null);
  const [sortColumn, setSortColumn] = useState(null);
  const [sortDirection, setSortDirection] = useState('asc');
  const [attendanceRate, setAttendanceRate] = useState('0');

  const showNotification = (message, type = 'info') => {
    setNotification({ message, type });
    setTimeout(() => setNotification(null), 5000);
  };

  const loadUsers = useCallback(async () => {
    try {
      const token = localStorage.getItem('jwt_token');
      const response = await fetch('http://localhost:8000/users/', {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (response.ok) {
        const data = await response.json();
        setUsers(data);
      }
    } catch (error) {
      console.error('Ошибка загрузки пользователей:', error);
    }
  }, []);

  const loadGroups = useCallback(async () => {
    try {
      const data = await api.getGroups();
      setGroups(data || []);
    } catch (error) {
      console.error('Ошибка загрузки групп:', error);
    }
  }, []);

  const loadPendingUsers = useCallback(async () => {
    try {
      const token = localStorage.getItem('jwt_token');
      const response = await fetch('http://localhost:8000/users/pending', {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (response.ok) {
        const data = await response.json();
        setPendingUsers(data);
      }
    } catch (error) {
      console.error('Ошибка загрузки заявок:', error);
    }
  }, []);

  const loadAttendanceStats = useCallback(async () => {
    if (groups.length === 0) return;
    
    const year = new Date().getFullYear();
    const month = new Date().getMonth() + 1;
    let totalGroups = 0;
    let sumOfRates = 0;
    
    for (const group of groups) {
      try {
        const stats = await api.getAttendanceStats(group.id, year, month);
        if (stats.attendance_rate > 0) {
          totalGroups++;
          sumOfRates += stats.attendance_rate;
        }
      } catch (error) {
        console.error(`Ошибка группы ${group.id}:`, error);
      }
    }
    
    const avgRate = totalGroups > 0 ? (sumOfRates / totalGroups).toFixed(1) : 0;
    setAttendanceRate(avgRate);
  }, [groups]);

  useEffect(() => {
    loadUsers();
    loadGroups();
    loadPendingUsers();
  }, [loadUsers, loadGroups, loadPendingUsers]);

  useEffect(() => {
    if (groups.length > 0) {
      loadAttendanceStats();
    }
  }, [groups, loadAttendanceStats]);

  const handleSort = (column) => {
    if (sortColumn === column) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
    } else {
      setSortColumn(column);
      setSortDirection('asc');
    }
  };

  const getSortedUsers = () => {
    if (!sortColumn) return users.filter(u => u.role !== 'PENDING');
    
    const columns = ['full_name', 'role', 'email'];
    const columnName = columns[sortColumn];
    
    return [...users.filter(u => u.role !== 'PENDING')].sort((a, b) => {
      let aVal = a[columnName] || '';
      let bVal = b[columnName] || '';
      
      if (sortDirection === 'asc') {
        return aVal > bVal ? 1 : -1;
      } else {
        return aVal < bVal ? 1 : -1;
      }
    });
  };

  const getRoleName = (role) => {
    const roles = {
      'ADMIN': 'Администратор',
      'TEACHER': 'Воспитатель',
      'ACCOUNTANT': 'Бухгалтер',
      'PENDING': 'Ожидает подтверждения'
    };
    return roles[role] || role;
  };

  const assignGroup = async (userId) => {
    const select = document.getElementById(`group-select-${userId}`);
    const groupId = select?.value;
    
    if (!groupId) {
      showNotification('Выберите группу для назначения!', 'error');
      return;
    }
    
    const token = localStorage.getItem('jwt_token');
    
    try {
      const response = await fetch(`http://localhost:8000/users/${userId}/assign-group?group_id=${groupId}`, {
        method: 'PUT',
        headers: { 'Authorization': `Bearer ${token}` }
      });
      
      if (response.ok) {
        showNotification('✅ Группа назначена учителю!', 'success');
        loadUsers();
        loadGroups();
      } else {
        const error = await response.json();
        showNotification('Ошибка: ' + error.detail, 'error');
      }
    } catch (error) {
      console.error('Ошибка:', error);
      showNotification('Ошибка при назначении группы', 'error');
    }
  };

  const addUser = async () => {
    const name = window.prompt('Введите ФИО пользователя:');
    if (!name) return;
    const email = window.prompt('Введите email:');
    if (!email) return;
    const role = window.prompt('Введите роль (ADMIN/TEACHER/ACCOUNTANT):');
    if (!role) return;
    const password = window.prompt('Введите пароль (минимум 6 символов):');
    if (!password || password.length < 6) {
      showNotification('Пароль должен быть не менее 6 символов', 'error');
      return;
    }
    
    try {
      await api.registerUser(email, password, name, role);
      showNotification('✅ Пользователь успешно добавлен!', 'success');
      loadUsers();
    } catch (error) {
      showNotification('Ошибка при добавлении пользователя', 'error');
    }
  };

  const approveUser = async (userId, role) => {
    let groupId = null;
    
    if (role === 'TEACHER') {
      const select = document.getElementById(`group-${userId}`);
      groupId = select?.value;
      if (!groupId) {
        showNotification('Для воспитателя необходимо выбрать группу!', 'error');
        return;
      }
    }
    
    try {
      const token = localStorage.getItem('jwt_token');
      const url = `http://localhost:8000/users/${userId}/approve` + (groupId ? `?group_id=${groupId}` : '');
      const response = await fetch(url, {
        method: 'PUT',
        headers: { 'Authorization': `Bearer ${token}` }
      });
      
      if (response.ok) {
        showNotification('✅ Пользователь активирован!', 'success');
        loadPendingUsers();
        loadUsers();
        loadGroups();
      } else {
        const error = await response.json();
        showNotification('Ошибка: ' + error.detail, 'error');
      }
    } catch (error) {
      showNotification('Ошибка при подтверждении', 'error');
    }
  };

  const rejectUser = async (userId) => {
    if (!window.confirm('Вы уверены, что хотите отклонить заявку?')) return;
    
    try {
      const token = localStorage.getItem('jwt_token');
      const response = await fetch(`http://localhost:8000/users/${userId}/reject`, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${token}` }
      });
      
      if (response.ok) {
        showNotification('❌ Заявка отклонена', 'success');
        loadPendingUsers();
      } else {
        const error = await response.json();
        showNotification('Ошибка: ' + error.detail, 'error');
      }
    } catch (error) {
      showNotification('Ошибка при отклонении', 'error');
    }
  };

  const createReport = () => {
    const reportType = window.prompt('Тип отчёта (monthly/attendance/financial):', 'monthly');
    if (!reportType) return;
    const reportPeriod = window.prompt('Период (например, 2026-03):', '2026-03');
    if (!reportPeriod) return;
    showNotification(`Отчёт ${reportType} за ${reportPeriod} создаётся...`, 'info');
  };

  const saveSettings = () => {
    showNotification('✅ Настройки сохранены!', 'success');
  };

  const activeUsers = users.filter(u => u.is_active && u.role !== 'PENDING').length;
  const newThisMonth = users.filter(u => {
    const created = new Date(u.created_at);
    const now = new Date();
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
    return created >= monthStart;
  }).length;

  const sortedUsers = getSortedUsers();

  const renderSection = () => {
    switch(activeSection) {
      case 'attendance':
        return (
          <div className="big-stat">
            <h3>Общий уровень посещаемости</h3>
            <p className="big-value">{attendanceRate}%</p>
            <div className="users-list">
              <h3>Управление пользователями</h3>
              <div className="user-item" style={{ cursor: 'pointer' }} onClick={() => setActiveSection('users')}>
                <div className="user-avatar">👥</div>
                <div className="user-info">
                  <strong>Перейти к управлению</strong>
                  <span>Нажмите, чтобы открыть список пользователей</span>
                </div>
                <button className="btn-small">→</button>
              </div>
            </div>
          </div>
        );

      case 'users':
        return (
          <>
            <div className="section-header">
              <h3>Все пользователи</h3>
              <button className="btn-primary" onClick={addUser}>+ Добавить пользователя</button>
            </div>
            <table className="admin-table">
              <thead>
                <tr>
                  <th onClick={() => handleSort(0)}>ФИО {sortColumn === 0 && (sortDirection === 'asc' ? '↑' : '↓')}</th>
                  <th onClick={() => handleSort(1)}>Роль {sortColumn === 1 && (sortDirection === 'asc' ? '↑' : '↓')}</th>
                  <th onClick={() => handleSort(2)}>Email {sortColumn === 2 && (sortDirection === 'asc' ? '↑' : '↓')}</th>
                  <th>Группа</th>
                  <th>Статус</th>
                  <th>Действия</th>
                </tr>
              </thead>
              <tbody>
                {sortedUsers.length === 0 ? (
                  <tr><td colSpan="6" style={{ textAlign: 'center' }}>Нет пользователей</td></tr>
                ) : (
                  sortedUsers.map(user => (
                    <tr key={user.id}>
                      <td>{user.full_name || '—'}</td>
                      <td>{getRoleName(user.role)}</td>
                      <td>{user.email || '—'}</td>
                      <td>
                        {user.role === 'TEACHER' ? (
                          <>
                            <select id={`group-select-${user.id}`} className="group-select-small">
                              <option value="">-- Выберите группу --</option>
                              {groups.map(g => (
                                <option key={g.id} value={g.id} selected={g.teacher_id === user.id}>{g.name}</option>
                              ))}
                            </select>
                            <button className="btn-icon" onClick={() => assignGroup(user.id)}>📎</button>
                          </>
                        ) : (user.group_id || '—')}
                      </td>
                      <td><span className={`status ${user.is_active ? 'active' : ''}`}>{user.is_active ? 'Активен' : 'Неактивен'}</span></td>
                      <td>
                        <button className="btn-icon" onClick={() => console.log('Edit', user.id)}>✏️</button>
                        <button className="btn-icon" onClick={() => console.log('Delete', user.id)}>🗑️</button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </>
        );

      case 'pending':
        return (
          <>
            <div className="section-header">
              <h3>📋 Заявки на регистрацию</h3>
              <p style={{ color: '#718096' }}>Пользователи, ожидающие подтверждения</p>
            </div>
            <div className="table-container">
              <table className="admin-table">
                <thead>
                  <tr>
                    <th>ФИО</th>
                    <th>Email</th>
                    <th>Запрошенная роль</th>
                    <th>Дата заявки</th>
                    <th>Группа (для учителя)</th>
                    <th>Действия</th>
                  </tr>
                </thead>
                <tbody>
                  {pendingUsers.length === 0 ? (
                    <tr><td colSpan="6" style={{ textAlign: 'center' }}>✅ Нет новых заявок</td></tr>
                  ) : (
                    pendingUsers.map(user => (
                      <tr key={user.id}>
                        <td>{user.full_name}</td>
                        <td>{user.email}</td>
                        <td>{getRoleName(user.role)}</td>
                        <td>{new Date(user.created_at).toLocaleDateString()}</td>
                        <td>
                          {user.role === 'TEACHER' ? (
                            <select id={`group-${user.id}`} className="group-select">
                              <option value="">-- Выберите группу --</option>
                              {groups.map(g => <option key={g.id} value={g.id}>{g.name}</option>)}
                            </select>
                          ) : '—'}
                        </td>
                        <td>
                          <button className="btn-small" onClick={() => approveUser(user.id, user.role)}>✅ Подтвердить</button>
                          <button className="btn-delete" onClick={() => rejectUser(user.id)}>❌ Отклонить</button>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </>
        );

      case 'reports':
        return (
          <>
            <div className="section-header">
              <h3>Управление отчётами</h3>
              <button className="btn-primary" onClick={createReport}>+ Создать отчёт</button>
            </div>
            <div className="reports-list">
              <div className="report-item" style={{ justifyContent: 'center', color: '#718096' }}>Нет доступных отчётов</div>
            </div>
          </>
        );

      case 'statistics':
        return (
          <div className="stats-grid">
            <div className="stat-box"><h4>Активных:</h4><p className="stat-number">{activeUsers}</p></div>
            <div className="stat-box"><h4>Новых за месяц:</h4><p className="stat-number">{newThisMonth}</p></div>
            <div className="stat-box"><h4>Всего групп:</h4><p className="stat-number">{groups.length}</p></div>
            <div className="stat-box"><h4>Ошибки API:</h4><p className="stat-number">0</p></div>
          </div>
        );

      case 'settings':
        return (
          <div className="settings-group">
            <h3>Системные настройки</h3>
            <div className="setting-item"><label>Уведомления включены</label><label className="switch"><input type="checkbox" defaultChecked /><span className="slider"></span></label></div>
            <div className="setting-item"><label>Автосохранение</label><label className="switch"><input type="checkbox" defaultChecked /><span className="slider"></span></label></div>
            <div className="setting-item"><label>Язык интерфейса:</label><select defaultValue="ru"><option>Русский</option><option>English</option></select></div>
            <div className="setting-item"><label>Режим обслуживания:</label><label className="switch"><input type="checkbox" /><span className="slider"></span></label></div>
            <button className="btn-primary" onClick={saveSettings}>Сохранить настройки</button>
          </div>
        );

      default:
        return null;
    }
  };

  const navItems = [
    { id: 'attendance', icon: '📊', label: 'Посещаемость' },
    { id: 'users', icon: '👥', label: 'Пользователи' },
    { id: 'pending', icon: '📝', label: 'Заявки', badge: pendingUsers.length },
    { id: 'reports', icon: '📄', label: 'Отчёты' },
    { id: 'statistics', icon: '📈', label: 'Статистика' },
    { id: 'settings', icon: '⚙️', label: 'Настройки' }
  ];

  return (
    <div className="admin-page">
      <CloudBackground />
      <div className="admin-container">
        <aside className="admin-sidebar">
          <div className="sidebar-header">
            <div className="logo">☁️</div>
            <h2>Админ-панель</h2>
          </div>
          <nav className="sidebar-nav">
            {navItems.map(item => (
              <a key={item.id} href="#" className={`nav-item ${activeSection === item.id ? 'active' : ''}`} onClick={(e) => { e.preventDefault(); setActiveSection(item.id); }}>
                <span className="nav-icon">{item.icon}</span>
                <span>{item.label}</span>
                {item.badge > 0 && <span className="badge">{item.badge}</span>}
              </a>
            ))}
            <a href="#" className="nav-item" onClick={(e) => { e.preventDefault(); logout(); }}>
              <span className="nav-icon">🚪</span>
              <span>Выйти</span>
            </a>
          </nav>
        </aside>

        <main className="admin-main">
          {renderSection()}
        </main>
      </div>
      {notification && <Notification message={notification.message} type={notification.type} onClose={() => setNotification(null)} />}
    </div>
  );
};
