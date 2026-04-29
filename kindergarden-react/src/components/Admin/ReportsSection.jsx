import React, { useState, useEffect } from 'react';
import api from '../../services/api';

const ReportsSection = ({ groups, showNotification }) => {
  const [reports, setReports] = useState([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    loadReports();
  }, []);

  const loadReports = async () => {
    const today = new Date();
    const currentMonth = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-01`;
    const mockReports = [];
    
    for (const group of groups) {
      mockReports.push({
        id: `payment-${group.id}-${currentMonth}`,
        name: `Платёжный отчёт - ${group.name} - ${today.toLocaleString('ru', { month: 'long', year: 'numeric' })}`,
        created_at: new Date().toISOString().split('T')[0],
        author: 'Система',
        type: 'payment',
        group_id: group.id,
        month: currentMonth
      });
    }
    
    setReports(mockReports);
  };

  const createReport = () => {
    const reportType = window.prompt('Тип отчёта (monthly/attendance/financial):', 'monthly');
    if (!reportType) return;
    
    const reportPeriod = window.prompt('Период (например, 2026-03):', '2026-03');
    if (!reportPeriod) return;
    
    showNotification(`Отчёт ${reportType} за ${reportPeriod} создаётся...`, 'info');
    setTimeout(() => loadReports(), 1000);
  };

  return (
    <div id="section-reports" className="admin-section">
      <div className="section-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
        <h3>Управление отчётами</h3>
        <button className="btn-primary" onClick={createReport}>+ Создать отчёт</button>
      </div>
      
      <div className="reports-list">
        {reports.length === 0 ? (
          <div className="report-item" style={{ justifyContent: 'center', color: '#718096' }}>Нет доступных отчётов</div>
        ) : (
          reports.map(report => (
            <div key={report.id} className="report-item">
              <div className="report-info">
                <strong>{report.name}</strong>
                <span>Создан: {report.created_at} | Автор: {report.author || 'Система'}</span>
              </div>
              <div className="report-actions">
                <button className="btn-small" onClick={() => showNotification(`Скачивание: ${report.name}`, 'info')}>📥 Скачать</button>
                <button className="btn-delete" onClick={() => showNotification('Отчёт удалён', 'info')}>🗑️ Удалить</button>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
};

export default ReportsSection;
