import React, { useState } from 'react';
import api from '../../services/api';

const UsersSection = ({ users, groups, onUpdate, showNotification }) => {
  const [sortColumn, setSortColumn] = useState(null);
  const [sortDirection, setSortDirection] = useState('asc');

  const getRoleName = (role) => {
    const roles = {
      'ADMIN': 'Администратор',
      'TEACHER': 'Воспитатель',
      'ACCOUNTANT': 'Бухгалтер',
      'PENDING': 'Ожидает подтверждения'
    };
    return roles[role] || role;
  };

  const handleSort = (column, type = 'string') => {
    if (sortColumn === column) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
    } else {
      setSortColumn(column);
      setSortDirection('asc');
    }
  };

  const getSortedUsers = () => {
    if (!sortColumn) return users;
    
    return [...users].sort((a, b) => {
      let aVal, bVal;
      const columns = ['full_name', 'role', 'email', 'group_id', 'is_active'];
      const columnName = columns[sortColumn];
      
      if (columnName === 'is_active') {
        aVal = a.is_active ? 1 : 0;
        bVal = b.is_active ? 1 : 0;
      } else {
        aVal = a[columnName] || '';
        bVal = b[columnName] || '';
      }
      
      if (sortDirection === 'asc') {
        return aVal > bVal ? 1 : -1;
      } else {
        return aVal < bVal ? 1 : -1;
      }
    });
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
      onUpdate();
    } catch (error) {
      showNotification('Ошибка при добавлении пользователя', 'error');
    }
  };

  const sortedUsers = getSortedUsers();
  const activeUsers = sortedUsers.filter(u => u.role !== 'PENDING');

  return (
    <div id="section-users" className="admin-section">
      <div className="section-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
        <h3>Все пользователи</h3>
        <button className="btn-primary" onClick={addUser}>+ Добавить пользователя</button>
      </div>
      <table className="admin-table">
        <thead>
          <tr>
            <th onClick={() => handleSort(0)} style={{ cursor: 'pointer' }}>ФИО {sortColumn === 0 && (sortDirection === 'asc' ? '↑' : '↓')}</th>
            <th onClick={() => handleSort(1)} style={{ cursor: 'pointer' }}>Роль {sortColumn === 1 && (sortDirection === 'asc' ? '↑' : '↓')}</th>
            <th onClick={() => handleSort(2)} style={{ cursor: 'pointer' }}>Email {sortColumn === 2 && (sortDirection === 'asc' ? '↑' : '↓')}</th>
            <th>Группа</th>
            <th onClick={() => handleSort(4)} style={{ cursor: 'pointer' }}>Статус {sortColumn === 4 && (sortDirection === 'asc' ? '↑' : '↓')}</th>
            <th>Действия</th>
          </tr>
        </thead>
        <tbody>
          {activeUsers.length === 0 ? (
            <tr><td colSpan="6" style={{ textAlign: 'center' }}>Нет пользователей</td></tr>
          ) : (
            activeUsers.map(user => (
              <tr key={user.id}>
                <td>{user.full_name || '—'}</td>
                <td>{getRoleName(user.role)}</td>
                <td>{user.email || '—'}</td>
                <td>{user.group_id || '—'}</td>
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
    </div>
  );
};

export default UsersSection;
