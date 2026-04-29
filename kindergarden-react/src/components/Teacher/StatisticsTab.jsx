import React, { useState, useEffect } from 'react';
import api from '../../services/api';

const StatisticsTab = ({ groupId, currentDate }) => {
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (groupId) {
      loadStats();
    }
  }, [groupId, currentDate]);

  const loadStats = async () => {
    setLoading(true);
    try {
      const year = currentDate.getFullYear();
      const month = currentDate.getMonth() + 1;
      const data = await api.getAttendanceStats(groupId, year, month);
      setStats(data);
    } catch (error) {
      console.error('Ошибка загрузки статистики:', error);
      setStats(null);
    } finally {
      setLoading(false);
    }
  };

  if (loading) return <div style={{ textAlign: 'center', padding: '40px' }}>Загрузка статистики...</div>;
  if (!groupId) return <div style={{ textAlign: 'center', padding: '40px' }}>👈 Выберите группу</div>;
  if (!stats) return <div style={{ textAlign: 'center', padding: '40px' }}>Нет данных</div>;

  const monthNames = ['Январь', 'Февраль', 'Март', 'Апрель', 'Май', 'Июнь', 'Июль', 'Август', 'Сентябрь', 'Октябрь', 'Ноябрь', 'Декабрь'];

  return (
    <div id="statistics" className="tab-panel active">
      <div className="stats-cards">
        <div className="stat-card">
          <h3>Всего детей:</h3>
          <p className="stat-value">{stats.total_children || 0}</p>
        </div>
        <div className="stat-card">
          <h3>Посещаемость:</h3>
          <p className="stat-value">{(stats.attendance_rate || 0).toFixed(1)}%</p>
        </div>
        <div className="stat-card">
          <h3>Присутствий:</h3>
          <p className="stat-value">{stats.total_present || 0}</p>
        </div>
      </div>

      <div className="chart-container">
        <h3>Посещаемость по дням - {monthNames[currentDate.getMonth()]} {currentDate.getFullYear()}</h3>
        <div className="bar-chart-wrapper" id="attendanceChart" style={{ display: 'flex', justifyContent: 'space-around', alignItems: 'flex-end', height: '300px', padding: '20px' }}>
          {stats.by_day && Object.entries(stats.by_day).slice(0, 15).map(([day, data]) => {
            const percent = data.total > 0 ? (data.present / data.total) * 100 : 0;
            const height = Math.max(percent * 2, 20);
            return (
              <div key={day} className="bar-item">
                <div className="bar" style={{ height: `${height}px`, background: 'linear-gradient(to top, #ffb6c1, #ffc0cb)', borderRadius: '8px 8px 0 0', width: '60px' }}>
                  <span className="bar-value-inside" style={{ position: 'absolute', top: '-30px', left: '50%', transform: 'translateX(-50%)', fontWeight: 700 }}>{percent.toFixed(0)}%</span>
                </div>
                <span className="bar-label">{day}</span>
                <span className="bar-value" style={{ fontSize: '12px', color: '#718096' }}>{data.present}/{data.total}</span>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};

export default StatisticsTab;
