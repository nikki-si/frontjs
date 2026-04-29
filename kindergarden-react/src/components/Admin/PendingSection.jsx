import React, { useState } from 'react';
import api from '../../services/api';

const PendingSection = ({ pendingUsers, groups, onUpdate, onApprove, showNotification }) => {
  const [loading, setLoading] = useState({});

  const getRoleName = (role) => {
    const roles = {
      'ADMIN': 'Администратор',
      'TEACHER': 'Воспитатель',
      'ACCOUNTANT': 'Бухгалтер',
      'PENDING': 'Ожидает подтверждения'
    };
    return roles[role] || role;
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
    
    setLoading(prev => ({ ...prev, [userId]: true }));
    
    try {
      const token = localStorage.getItem('jwt_token');
      const url = `http://localhost:8000/users/${userId}/approve` + (groupId ? `?group_id=${groupId}` : '');
      const response = await fetch(url, {
        method: 'PUT',
        headers: { 'Authorization': `Bearer ${token}` }
      });
      
      if (response.ok) {
        showNotification('✅ Пользователь активирован!', 'success');
        onUpdate();
        onApprove();
      } else {
        const error = await response.json();
        showNotification('Ошибка: ' + error.detail, 'error');
      }
    } catch (error) {
      console.error('Ошибка:', error);
      showNotification('Ошибка при подтверждении', 'error');
    } finally {
      setLoading(prev => ({ ...prev, [userId]: false }));
    }
  };

  const rejectUser = async (userId) => {
    const confirmed = window.confirm('Вы уверены, что хотите отклонить заявку?');
    if (!confirmed) return;
    
    setLoading(prev => ({ ...prev, [userId]: true }));
    
    try {
      const token = localStorage.getItem('jwt_token');
      const response = await fetch(`http://localhost:8000/users/${userId}/reject`, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${token}` }
      });
      
      if (response.ok) {
        showNotification('❌ Заявка отклонена', 'success');
        onUpdate();
      } else {
        const error = await response.json();
        showNotification('Ошибка: ' + error.detail, 'error');
      }
    } catch (error) {
      console.error('Ошибка:', error);
      showNotification('Ошибка при отклонении', 'error');
    } finally {
      setLoading(prev => ({ ...prev, [userId]: false }));
    }
  };

  return (
    <div id="section-pending" className="admin-section">
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
                    <button 
                      className="btn-small" 
                      onClick={() => approveUser(user.id, user.role)}
                      disabled={loading[user.id]}
                    >
                      {loading[user.id] ? '...' : '✅ Подтвердить'}
                    </button>
                    <button 
                      className="btn-delete" 
                      onClick={() => rejectUser(user.id)}
                      disabled={loading[user.id]}
                    >
                      ❌ Отклонить
                    </button>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default PendingSection;
