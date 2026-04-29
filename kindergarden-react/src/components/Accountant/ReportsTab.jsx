import React, { useState } from 'react';
import api from '../../services/api';

const ReportsTab = ({ groups, showNotification }) => {
  const [reportType, setReportType] = useState('monthly');
  const [reportMonth, setReportMonth] = useState(new Date().toISOString().slice(0, 7));
  const [generating, setGenerating] = useState(false);

  const generatePDF = async () => {
    if (!reportMonth) {
      showNotification('Выберите период для отчёта', 'error');
      return;
    }
    
    setGenerating(true);
    try {
      const [year, month] = reportMonth.split('-');
      let results = [];
      
      for (const group of groups) {
        let reportData = { group_name: group.name, group_id: group.id };
        
        if (reportType === 'Ежемесячный отчёт' || reportType === 'Отчёт по посещаемости') {
          const stats = await api.getAttendanceStats(group.id, parseInt(year), parseInt(month));
          reportData = { ...stats, ...reportData, report_type: 'attendance' };
        } else if (reportType === 'Финансовый отчёт') {
          const paymentReport = await api.getGroupPaymentReport(group.id, `${year}-${month}-01`);
          reportData = { ...paymentReport, ...reportData, report_type: 'financial' };
        }
        
        results.push(reportData);
      }
      
      showNotification(`✅ Отчёт "${reportType}" за ${reportMonth} сформирован`, 'success');
    } catch (error) {
      console.error('Ошибка:', error);
      showNotification('Ошибка при генерации отчёта', 'error');
    } finally {
      setGenerating(false);
    }
  };

  return (
    <div id="reports" className="tab-panel">
      <div className="reports-section">
        <h3>Генерация отчётов</h3>
        <div className="report-options">
          <div className="report-option">
            <label>Тип отчёта:</label>
            <select value={reportType} onChange={(e) => setReportType(e.target.value)}>
              <option>Ежемесячный отчёт</option>
              <option>Отчёт по посещаемости</option>
              <option>Финансовый отчёт</option>
            </select>
          </div>
          <div className="report-option">
            <label>Период:</label>
            <input type="month" value={reportMonth} onChange={(e) => setReportMonth(e.target.value)} />
          </div>
          <button className="btn-primary" onClick={generatePDF} disabled={generating}>
            {generating ? 'Генерация...' : '📄 Сгенерировать PDF'}
          </button>
        </div>
      </div>
    </div>
  );
};

export default ReportsTab;
