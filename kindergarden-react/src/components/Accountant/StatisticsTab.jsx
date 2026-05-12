import React, { useState, useEffect } from 'react';
import api from '../../services/api';

const StatisticsTab = ({ groups }) => {
  const [groupStats, setGroupStats] = useState([]);
  const [weeklyData, setWeeklyData] = useState({ dates: [], rates: [], weekdays: [] });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (groups.length > 0) {
      loadStats();
      loadWeeklyStats();
    }
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

  const loadWeeklyStats = async () => {
    const dates = [];
    const weekdays = [];
    
    for (let i = 6; i >= 0; i--) {
      const date = new Date();
      date.setDate(date.getDate() - i);
      dates.push(date.toISOString().split('T')[0]);
      weekdays.push(date.toLocaleDateString('ru', { weekday: 'short' }));
    }
    
    const dailyStats = {};
    dates.forEach(date => { dailyStats[date] = { present: 0, total: 0 }; });
    
    for (const group of groups) {
      for (const date of dates) {
        try {
          const journal = await api.getDailyJournal(group.id, date);
          if (journal && journal.records) {
            const presentCount = journal.records.filter(r => r.status === 'present').length;
            dailyStats[date].present += presentCount;
            dailyStats[date].total += journal.total_children || 0;
          }
        } catch (error) {
          console.error(`Ошибка загрузки за ${date}:`, error);
        }
      }
    }
    
    const weeklyRates = dates.map(date => {
      const stats = dailyStats[date];
      if (stats.total === 0) return 0;
      return (stats.present / stats.total) * 100;
    });
    
    setWeeklyData({ dates, rates: weeklyRates, weekdays });
  };

  if (loading) return <div style={{ textAlign: 'center', padding: '40px' }}>Загрузка...</div>;

  // Находим максимальное значение для шкалы
  const maxRate = Math.max(...groupStats.map(s => s.rate), 100);

  return (
    <div id="statistics" className="tab-panel active">
      <div className="chart-container">
        <h3>Посещаемость по группам</h3>
        <div className="bar-chart-wrapper">
          {groupStats.map((stat, idx) => {
            const height = Math.max((stat.rate / maxRate) * 200, 20);
            return (
              <div key={idx} className="bar-item">
                <div className="bar" style={{ height: `${height}px`, width: '70px', background: 'linear-gradient(to top, #ffb6c1, #ffc0cb)', borderRadius: '8px 8px 0 0', position: 'relative' }}>
                  <span className="bar-value-inside" style={{ position: 'absolute', top: '-35px', left: '50%', transform: 'translateX(-50%)', fontWeight: 700, background: 'white', padding: '4px 10px', borderRadius: '20px', boxShadow: '0 2px 8px rgba(0,0,0,0.1)' }}>
                    {stat.rate.toFixed(1)}%
                  </span>
                </div>
                <span className="bar-label">{stat.name}</span>
              </div>
            );
          })}
        </div>
      </div>

      <div className="chart-container">
        <h3>Динамика посещаемости (7 дней)</h3>
        <div className="line-chart-wrapper">
          <svg className="line-svg" viewBox="0 0 500 200" preserveAspectRatio="none" style={{ width: '100%', height: '180px' }}>
            <polyline 
              points={weeklyData.rates.map((rate, index) => {
                const x = 50 + (index * (400 / (weeklyData.rates.length - 1)));
                const y = 180 - (rate / 100) * 150;
                return `${x},${y}`;
              }).join(' ')} 
              fill="none" 
              stroke="#ffb6c1" 
              strokeWidth="4" 
              strokeLinecap="round" 
              strokeLinejoin="round"
            />
            {weeklyData.rates.map((rate, index) => {
              const x = 50 + (index * (400 / (weeklyData.rates.length - 1)));
              const y = 180 - (rate / 100) * 150;
              return (
                <circle key={index} cx={x} cy={y} r="6" fill="#ffb6c1" stroke="white" strokeWidth="2">
                  <title>{weeklyData.weekdays[index]}: {rate.toFixed(1)}%</title>
                </circle>
              );
            })}
          </svg>
          <div className="line-labels">
            {weeklyData.weekdays.map((day, idx) => (
              <span key={idx}>{day}</span>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};

export default StatisticsTab;
