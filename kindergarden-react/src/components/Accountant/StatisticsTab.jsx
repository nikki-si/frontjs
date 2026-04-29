import React, { useState, useEffect } from 'react';
import api from '../../services/api';

const StatisticsTab = ({ groups }) => {
  const [groupStats, setGroupStats] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadStats();
  }, [groups]);

  const loadStats = async () => {
    const year = new Date().getFullYear();
    const month = new Date().getMonth() + 1;
    const stats = [];
    
    for (const group of groups) {
      try {
        const data = await api.getAttendanceStats(group.id, year, month);
        stats.push({ name: group.name, rate: data.attendance_rate || 0 });
      } catch (error) {
        stats.push({ name: group.name, rate: 0 });
      }
    }
    
    setGroupStats(stats);
    setLoading(false);
  };

  if (loading) return <div style={{ textAlign: 'center', padding: '40px' }}>Загрузка...</div>;

  return (
    <div id="statistics" className="tab-panel">
      <div className="chart-container">
        <h3>Посещаемость по группам</h3>
        <div className="bar-chart-wrapper">
          {groupStats.map((stat, idx) => {
            const height = Math.max(stat.rate * 2, 20);
            return (
              <div key={idx} className="bar-item">
                <div className="bar" style={{ height: `${height}px` }}>
                  <span className="bar-value-inside">{stat.rate.toFixed(1)}%</span>
                </div>
                <span className="bar-label">{stat.name}</span>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};

export default StatisticsTab;
