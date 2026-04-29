import React, { useState, useEffect } from 'react';
import api from '../../services/api';

const AttendanceSection = ({ groups }) => {
  const [stats, setStats] = useState({ avgRate: 0, totalGroups: 0 });

  useEffect(() => {
    if (groups.length > 0) {
      loadAttendanceStats();
    }
  }, [groups]);

  const loadAttendanceStats = async () => {
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
        console.error(`Ошибка статистики для группы ${group.id}:`, error);
      }
    }
    
    const avgRate = totalGroups > 0 ? (sumOfRates / totalGroups).toFixed(1) : 0;
    setStats({ avgRate, totalGroups });
  };

  return (
    <div id="section-attendance" className="admin-section active">
      <div className="big-stat">
        <h3>Общий уровень посещаемости</h3>
        <p className="big-value">{stats.avgRate}%</p>
        <div className="users-list">
          <h3>Управление пользователями</h3>
          <div 
            className="user-item" 
            style={{ cursor: 'pointer' }}
            onClick={() => document.querySelector('[data-section="users"]')?.click()}
          >
            <div className="user-avatar">👥</div>
            <div className="user-info">
              <strong>Перейти к управлению</strong>
              <span>Нажмите, чтобы открыть список пользователей</span>
            </div>
            <button className="btn-small">→</button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AttendanceSection;
