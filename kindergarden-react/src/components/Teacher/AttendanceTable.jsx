import React, { useState, useEffect, useCallback } from 'react';
import api from '../../services/api';

const AttendanceTable = ({ groupId, currentDate, showNotification }) => {
  const [children, setChildren] = useState([]);
  const [attendanceData, setAttendanceData] = useState({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const loadChildren = useCallback(async () => {
    if (!groupId) return;
    try {
      const data = await api.getChildrenByGroup(groupId);
      setChildren(data || []);
    } catch (error) {
      console.error('Ошибка загрузки детей:', error);
      showNotification('Ошибка загрузки списка детей', 'error');
    }
  }, [groupId, showNotification]);

  const loadAttendance = useCallback(async () => {
    if (!groupId || children.length === 0) return;
    const year = currentDate.getFullYear();
    const month = currentDate.getMonth() + 1;
    try {
      const data = await api.getAttendance(groupId, year, month);
      const formatted = {};
      if (data && Array.isArray(data)) {
        data.forEach(record => {
          const day = new Date(record.date).getDate();
          formatted[`${record.child_id}-${day}`] = record.status?.toLowerCase() || 'not_marked';
        });
      }
      setAttendanceData(formatted);
    } catch (error) {
      if (error.code !== 404) {
        console.error('Ошибка загрузки посещаемости:', error);
      }
    } finally {
      setLoading(false);
    }
  }, [groupId, children, currentDate]);

  useEffect(() => {
    if (groupId) {
      loadChildren();
    }
  }, [groupId, loadChildren]);

  useEffect(() => {
    if (children.length > 0) {
      loadAttendance();
    }
  }, [children, currentDate, loadAttendance]);

  const markAll = useCallback(async (status) => {
    if (!groupId || !currentDate) return;
    
    const today = new Date();
    const isCurrentMonth = today.getFullYear() === currentDate.getFullYear() && today.getMonth() === currentDate.getMonth();
    const day = today.getDate();
    
    if (!isCurrentMonth) {
      showNotification('⚠️ Массовая отметка доступна только для текущего месяца', 'warning');
      return;
    }
    
    const year = currentDate.getFullYear();
    const month = currentDate.getMonth() + 1;
    const dateStr = `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
    
    const statusText = status === 'present' ? 'присутствующими' : status === 'absent' ? 'отсутствующими' : 'болеющими';
    
    if (!window.confirm(`Отметить всех детей как ${statusText} на ${dateStr}?`)) return;
    
    setSaving(true);
    try {
      await api.markAttendanceBulk(groupId, dateStr, status);
      
      children.forEach(child => {
        setAttendanceData(prev => ({ ...prev, [`${child.id}-${day}`]: status }));
      });
      
      showNotification(`✅ Все отмечены как ${statusText}`, 'success');
    } catch (error) {
      console.error('Ошибка массовой отметки:', error);
      showNotification('❌ Ошибка при массовой отметке', 'error');
    } finally {
      setSaving(false);
    }
  }, [groupId, currentDate, children, showNotification]);

  useEffect(() => {
    const handleMarkAllPresent = () => markAll('present');
    const handleMarkAllAbsent = () => markAll('absent');
    
    window.addEventListener('markAllPresent', handleMarkAllPresent);
    window.addEventListener('markAllAbsent', handleMarkAllAbsent);
    
    return () => {
      window.removeEventListener('markAllPresent', handleMarkAllPresent);
      window.removeEventListener('markAllAbsent', handleMarkAllAbsent);
    };
  }, [markAll]);

  const toggleAttendance = async (childId, day) => {
    if (saving) return;
    
    const year = currentDate.getFullYear();
    const month = currentDate.getMonth() + 1;
    const dateStr = `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
    
    const currentStatus = attendanceData[`${childId}-${day}`] || 'not_marked';
    const statusCycle = ['not_marked', 'present', 'absent', 'sick'];
    const currentIndex = statusCycle.indexOf(currentStatus);
    const newStatus = statusCycle[(currentIndex + 1) % statusCycle.length];
    
    const oldStatus = currentStatus;
    setAttendanceData(prev => ({ ...prev, [`${childId}-${day}`]: newStatus }));
    setSaving(true);
    
    try {
      await api.markAttendance(childId, dateStr, newStatus);
      showNotification('✅ Сохранено', 'success');
    } catch (error) {
      console.error('Ошибка сохранения:', error);
      setAttendanceData(prev => ({ ...prev, [`${childId}-${day}`]: oldStatus }));
      showNotification('❌ Не удалось сохранить', 'error');
    } finally {
      setSaving(false);
    }
  };

  const getStatusClass = (status) => {
    const map = { 
      'present': 'present', 
      'absent': 'absent', 
      'sick': 'sick', 
      'not_marked': 'empty' 
    };
    return map[status?.toLowerCase()] || 'empty';
  };

  const getStatusSymbol = (status) => {
    const map = { 
      'present': '✓', 
      'absent': '✗', 
      'sick': '🤒', 
      'not_marked': '○' 
    };
    return map[status?.toLowerCase()] || '○';
  };

  const daysInMonth = new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 0).getDate();
  const today = new Date();
  const isCurrentMonth = today.getFullYear() === currentDate.getFullYear() && today.getMonth() === currentDate.getMonth();

  const getDayTotals = () => {
    const totals = {};
    for (let day = 1; day <= daysInMonth; day++) {
      let present = 0;
      let sick = 0;
      let total = 0;
      children.forEach(child => {
        const status = attendanceData[`${child.id}-${day}`];
        if (status && status !== 'not_marked') {
          total++;
          if (status === 'present') present++;
          if (status === 'sick') sick++;
        } else if (status === 'not_marked') {
          total++;
        }
      });
      totals[day] = { present, sick, total };
    }
    return totals;
  };

  const dayTotals = getDayTotals();
  const todayDay = today.getDate();
  const todayStats = dayTotals[todayDay] || { present: 0, sick: 0, total: children.length };
  const totalChildren = children.length;
  const presentToday = isCurrentMonth ? todayStats.present : '—';
  const absentToday = isCurrentMonth ? (totalChildren - todayStats.present - todayStats.sick) : '—';

  if (loading) return <div className="table-container"><div style={{ textAlign: 'center', padding: '40px' }}>Загрузка...</div></div>;
  if (!groupId) return <div className="table-container"><div style={{ textAlign: 'center', padding: '40px' }}>👈 Выберите группу</div></div>;
  if (children.length === 0) return <div className="table-container"><div style={{ textAlign: 'center', padding: '40px' }}>👶 В этой группе пока нет детей</div></div>;

  return (
    <>
      <div className="table-container">
        <table className="attendance-table">
          <thead>
            <tr>
              <th>ФИО ребёнка</th>
              {Array.from({ length: daysInMonth }, (_, i) => {
                const day = i + 1;
                const date = new Date(currentDate.getFullYear(), currentDate.getMonth(), day);
                const dayOfWeek = ['Вс', 'Пн', 'Вт', 'Ср', 'Чт', 'Пт', 'Сб'][date.getDay()];
                return (
                  <th key={day} style={isCurrentMonth && day === today.getDate() ? { background: '#fff3cd' } : {}}>
                    {day}<br /><small>{dayOfWeek}</small>
                  </th>
                );
              })}
            </tr>
          </thead>
          <tbody>
            {children.map(child => (
              <tr key={child.id}>
                <td className="name-col">{child.full_name || child.name}</td>
                {Array.from({ length: daysInMonth }, (_, i) => {
                  const day = i + 1;
                  const status = attendanceData[`${child.id}-${day}`] || 'not_marked';
                  const cellDate = new Date(currentDate.getFullYear(), currentDate.getMonth(), day);
                  const isDisabled = isCurrentMonth && cellDate > today;
                  return (
                    <td key={day}>
                      <button
                        className={`attendance-btn ${getStatusClass(status)}`}
                        onClick={() => toggleAttendance(child.id, day)}
                        disabled={isDisabled}
                        style={isDisabled ? { opacity: 0.5, cursor: 'not-allowed' } : {}}
                      >
                        {getStatusSymbol(status)}
                      </button>
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
          <tfoot>
            <tr className="summary-row">
              <td><strong>Итого</strong></td>
              {Array.from({ length: daysInMonth }, (_, i) => {
                const day = i + 1;
                const stats = dayTotals[day];
                const percent = stats.total > 0 ? Math.round((stats.present / stats.total) * 100) : 0;
                return (
                  <td key={day} style={{ fontWeight: 600, color: percent >= 80 ? '#48bb78' : percent >= 50 ? '#ed8936' : '#f56565' }}>
                    {stats.present}/{stats.total}
                  </td>
                );
              })}
            </tr>
          </tfoot>
        </table>
      </div>

      <div className="summary-info">
        <div className="summary-card">
          <span className="summary-label">Всего детей</span>
          <span className="summary-value">{totalChildren}</span>
        </div>
        <div className="summary-card">
          <span className="summary-label">Присутствуют сегодня</span>
          <span className="summary-value">{presentToday}</span>
        </div>
        <div className="summary-card">
          <span className="summary-label">Отсутствуют сегодня</span>
          <span className="summary-value">{absentToday}</span>
        </div>
      </div>
    </>
  );
};

export default AttendanceTable;
