import React from 'react';

const StatisticsSection = ({ users, groups }) => {
  const activeUsers = users.filter(u => u.is_active).length;
  const now = new Date();
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
  const newThisMonth = users.filter(u => {
    const created = new Date(u.created_at);
    return created >= monthStart;
  }).length;

  return (
    <div id="section-statistics" className="admin-section">
      <div className="stats-grid">
        <div className="stat-box">
          <h4>Активных пользователей:</h4>
          <p className="stat-number">{activeUsers}</p>
        </div>
        <div className="stat-box">
          <h4>Новых за месяц:</h4>
          <p className="stat-number">{newThisMonth}</p>
        </div>
        <div className="stat-box">
          <h4>Всего групп:</h4>
          <p className="stat-number">{groups.length}</p>
        </div>
        <div className="stat-box">
          <h4>Ошибки API:</h4>
          <p className="stat-number">0</p>
        </div>
      </div>
    </div>
  );
};

export default StatisticsSection;
