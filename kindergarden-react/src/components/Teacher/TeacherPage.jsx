import React, { useState, useEffect, useCallback } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { CloudBackground } from '../Common/CloudBackground';
import { Notification } from '../Common/Notification';
import LoadingSpinner from '../Common/LoadingSpinner';
import AttendanceTable from './AttendanceTable';
import StatisticsTab from './StatisticsTab';
import ReportsTab from './ReportsTab';
import AITab from './AITab';
import api from '../../services/api';

export const TeacherPage = () => {
  const { user, logout } = useAuth();
  const [activeTab, setActiveTab] = useState('journal');
  const [groups, setGroups] = useState([]);
  const [currentGroupId, setCurrentGroupId] = useState(null);
  const [currentDate, setCurrentDate] = useState(new Date());
  const [loading, setLoading] = useState(false);
  const [notification, setNotification] = useState(null);

  const showNotification = (message, type = 'info') => {
    setNotification({ message, type });
    setTimeout(() => setNotification(null), 5000);
  };

  const loadGroups = useCallback(async () => {
    setLoading(true);
    try {
      const data = await api.getMyGroups();
      setGroups(data || []);
      if (data?.length > 0 && !currentGroupId) {
        const savedGroup = localStorage.getItem('currentGroup');
        const groupToSelect = savedGroup && data.find(g => g.id == savedGroup) ? savedGroup : data[0].id;
        setCurrentGroupId(groupToSelect);
        localStorage.setItem('currentGroup', groupToSelect);
      }
    } catch (error) {
      console.error('Ошибка загрузки групп:', error);
      showNotification('Ошибка загрузки групп', 'error');
    } finally {
      setLoading(false);
    }
  }, [currentGroupId]);

  useEffect(() => {
    loadGroups();
  }, [loadGroups]);

  const changeMonth = (direction) => {
    const newDate = new Date(currentDate);
    newDate.setMonth(newDate.getMonth() + direction);
    setCurrentDate(newDate);
  };

  const changeGroup = (groupId) => {
    setCurrentGroupId(groupId);
    localStorage.setItem('currentGroup', groupId);
  };

  const renderTab = () => {
    switch(activeTab) {
      case 'journal':
        return <AttendanceTable groupId={currentGroupId} currentDate={currentDate} showNotification={showNotification} />;
      case 'statistics':
        return <StatisticsTab groupId={currentGroupId} currentDate={currentDate} />;
      case 'reports':
        return <ReportsTab groupId={currentGroupId} currentDate={currentDate} showNotification={showNotification} />;
      case 'ai':
        return <AITab groupId={currentGroupId} />;
      default:
        return <AttendanceTable groupId={currentGroupId} currentDate={currentDate} showNotification={showNotification} />;
    }
  };

  const tabs = [
    { id: 'journal', label: 'Журнал посещаемости', icon: '📖' },
    { id: 'statistics', label: 'Статистика', icon: '📊' },
    { id: 'reports', label: 'Отчёты', icon: '📄' },
    { id: 'ai', label: 'AI Прогноз', icon: '🤖' }
  ];

  const monthNames = ['Январь', 'Февраль', 'Март', 'Апрель', 'Май', 'Июнь', 'Июль', 'Август', 'Сентябрь', 'Октябрь', 'Ноябрь', 'Декабрь'];

  if (loading) return <LoadingSpinner />;

  return (
    <div className="teacher-page">
      <CloudBackground />
      <div className="container">
        <header className="header">
          <div className="header-content">
            <h1>🌸 Кабинет воспитателя</h1>
            <span className="position">{user?.name || 'Воспитатель'}</span>
          </div>
          <button className="btn-logout" onClick={logout}>🚪 Выйти</button>
        </header>

        <div className="control-panel">
          <div className="control-group">
            <label>👧 Группа:</label>
            <select 
              value={currentGroupId || ''} 
              onChange={(e) => changeGroup(e.target.value)} 
              disabled={groups.length === 0}
            >
              {groups.length === 0 ? (
                <option value="">Нет доступных групп</option>
              ) : (
                groups.map(group => (
                  <option key={group.id} value={group.id}>{group.name}</option>
                ))
              )}
            </select>
          </div>
          <div className="control-group">
            <button className="btn-nav" onClick={() => changeMonth(-1)}>◀</button>
            <span className="month-display">{monthNames[currentDate.getMonth()]} {currentDate.getFullYear()}</span>
            <button className="btn-nav" onClick={() => changeMonth(1)}>▶</button>
          </div>
        </div>

        <div className="tabs">
          {tabs.map(tab => (
            <button 
              key={tab.id} 
              className={`tab-btn ${activeTab === tab.id ? 'active' : ''}`} 
              onClick={() => setActiveTab(tab.id)}
            >
              {tab.icon} {tab.label}
            </button>
          ))}
        </div>

        <div className="tab-content">
          {renderTab()}
        </div>
      </div>
      {notification && <Notification message={notification.message} type={notification.type} onClose={() => setNotification(null)} />}
    </div>
  );
};
