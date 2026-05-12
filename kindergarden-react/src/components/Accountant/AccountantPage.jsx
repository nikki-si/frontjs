import React, { useState, useEffect, useCallback } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { CloudBackground } from '../Common/CloudBackground';
import { Notification } from '../Common/Notification';
import { getFullGreeting } from '../../utils/helpers';
import LoadingSpinner from '../Common/LoadingSpinner';
import JournalTab from './JournalTab';
import StatisticsTab from './StatisticsTab';
import ReportsTab from './ReportsTab';
import AITab from './AITab';
import api from '../../services/api';

export const AccountantPage = () => {
  const { user, logout } = useAuth();
  const [activeTab, setActiveTab] = useState('journal');
  const [groups, setGroups] = useState([]);
  const [loading, setLoading] = useState(false);
  const [notification, setNotification] = useState(null);

  const showNotification = (message, type = 'info') => {
    setNotification({ message, type });
    setTimeout(() => setNotification(null), 5000);
  };

  const loadGroups = useCallback(async () => {
    setLoading(true);
    try {
      const data = await api.getGroups();
      setGroups(data || []);
    } catch (error) {
      console.error('Ошибка загрузки групп:', error);
      showNotification('Ошибка загрузки групп', 'error');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadGroups();
  }, [loadGroups]);

  const tabs = [
    { id: 'journal', label: 'Журнал посещаемости', icon: '📖' },
    { id: 'statistics', label: 'Статистика', icon: '📊' },
    { id: 'reports', label: 'Отчёты', icon: '📄' },
    { id: 'ai', label: 'AI Прогноз', icon: '🤖' }
  ];

  const renderTab = () => {
    switch(activeTab) {
      case 'journal':
        return <JournalTab groups={groups} showNotification={showNotification} />;
      case 'statistics':
        return <StatisticsTab groups={groups} />;
      case 'reports':
        return <ReportsTab groups={groups} showNotification={showNotification} />;
      case 'ai':
        return <AITab groups={groups} />;
      default:
        return <JournalTab groups={groups} showNotification={showNotification} />;
    }
  };

  if (loading) return <LoadingSpinner />;

  return (
    <div className="accountant-page">
      <CloudBackground />
      <div className="container">
        <header className="header">
          <div className="header-content">
            <h1>💰 Кабинет бухгалтера</h1>
            <span className="position">{getFullGreeting(user?.name)}</span>
          </div>
          <button className="btn-logout" onClick={logout}>🚪 Выйти</button>
        </header>

        <div className="tabs">
          {tabs.map(tab => (
            <button key={tab.id} className={`tab-btn ${activeTab === tab.id ? 'active' : ''}`} onClick={() => setActiveTab(tab.id)}>
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
