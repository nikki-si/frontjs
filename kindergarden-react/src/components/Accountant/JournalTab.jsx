// src/components/Accountant/JournalTab.jsx
import React, { useState, useEffect } from 'react';
import api from '../../services/api';

const JournalTab = ({ groups, showNotification }) => {
  const [attendanceData, setAttendanceData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedMonth, setSelectedMonth] = useState(new Date().toISOString().slice(0, 7));

  useEffect(() => {
    loadAttendanceData();
  }, [groups, selectedMonth]);

  const loadAttendanceData = async () => {
    if (groups.length === 0) {
      setAttendanceData([]);
      setLoading(false);
      return;
    }
    
    setLoading(true);
    const [year, month] = selectedMonth.split('-');
    const allAttendance = [];
    
    for (const group of groups) {
      try {
        const attendance = await api.getAttendance(group.id, parseInt(year), parseInt(month));
        const children = await api.getChildrenByGroup(group.id);
        
        children.forEach(child => {
          const childAttendance = attendance.filter(a => a.child_id === child.id);
          const present = childAttendance.filter(a => a.status === 'present').length;
          const total = childAttendance.length;
          const percentage = total > 0 ? ((present / total) * 100).toFixed(1) : 0;
          
          allAttendance.push({
            name: child.full_name || child.name || `Ребёнок ID:${child.id}`,
            group: group.name,
            present,
            absent: total - present,
            percentage
          });
        });
      } catch (error) {
        console.error(`Ошибка обработки группы ${group.id}:`, error);
      }
    }
    
    allAttendance.sort((a, b) => b.percentage - a.percentage);
    setAttendanceData(allAttendance);
    setLoading(false);
  };

  const monthNames = ['Январь', 'Февраль', 'Март', 'Апрель', 'Май', 'Июнь', 'Июль', 'Август', 'Сентябрь', 'Октябрь', 'Ноябрь', 'Декабрь'];
  const [year, month] = selectedMonth.split('-');
  const stats = {
    totalChildren: attendanceData.length,
    avgAttendance: attendanceData.length > 0 
      ? (attendanceData.reduce((sum, d) => sum + parseFloat(d.percentage), 0) / attendanceData.length).toFixed(1)
      : 0,
    totalPresent: attendanceData.reduce((sum, d) => sum + d.present, 0)
  };

  if (loading) return <div className="tab-panel active"><div style={{ textAlign: 'center', padding: '40px' }}>Загрузка...</div></div>;

  return (
    <div id="journal" className="tab-panel active">
      <div className="control-group" style={{ marginBottom: '20px' }}>
        <label>📅 Период:</label>
        <input type="month" value={selectedMonth} onChange={(e) => setSelectedMonth(e.target.value)} style={{ padding: '10px', borderRadius: '10px', border: '2px solid #e2e8f0' }} />
      </div>
      
      <div className="stats-cards">
        <div className="stat-card"><h3>Всего детей:</h3><p className="stat-value">{stats.totalChildren}</p></div>
        <div className="stat-card"><h3>Уровень посещаемости:</h3><p className="stat-value">{stats.avgAttendance}%</p></div>
        <div className="stat-card"><h3>Посещений:</h3><p className="stat-value">{stats.totalPresent}</p></div>
      </div>

      <div className="table-container">
        <table className="read-only-table">
          <thead>
            <tr><th>ФИО</th><th>Группа</th><th>Посещено</th><th>Пропущено</th><th>%</th></tr>
          </thead>
          <tbody>
            {attendanceData.length === 0 ? (
              <tr><td colSpan="5" style={{ textAlign: 'center' }}>Нет данных о посещаемости</td></tr>
            ) : (
              attendanceData.map((item, idx) => (
                <tr key={idx}>
                  <td>{item.name}</td>
                  <td>{item.group}</td>
                  <td>{item.present}</td>
                  <td>{item.absent}</td>
                  <td style={{ color: item.percentage >= 80 ? '#48bb78' : item.percentage >= 50 ? '#ed8936' : '#f56565', fontWeight: 600 }}>
                    {item.percentage}%
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

export default JournalTab;