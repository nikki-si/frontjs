import React, { useState } from 'react';
import api from '../../services/api';

const ReportsTab = ({ groupId, currentDate, showNotification }) => {
  const [reportType, setReportType] = useState('monthly');
  const [reportMonth, setReportMonth] = useState(
    `${currentDate.getFullYear()}-${String(currentDate.getMonth() + 1).padStart(2, '0')}`
  );
  const [generating, setGenerating] = useState(false);

  const handleGenerateReport = async () => {
    if (!groupId) {
      showNotification('⚠️ Выберите группу', 'warning');
      return;
    }

    setGenerating(true);
    try {
      await api.generateReport(reportType, groupId, reportMonth);
      showNotification('✅ Отчёт сгенерирован!', 'success');
    } catch (error) {
      console.error('Ошибка генерации отчёта:', error);
      showNotification('❌ Ошибка при генерации отчёта', 'error');
    } finally {
      setGenerating(false);
    }
  };

  const handleExportExcel = async () => {
    if (!groupId) {
      showNotification('⚠️ Выберите группу', 'warning');
      return;
    }

    setGenerating(true);
    try {
      await api.exportToExcel(groupId, reportMonth);
      showNotification('📥 Экспорт завершён!', 'success');
    } catch (error) {
      console.error('Ошибка экспорта:', error);
      showNotification('❌ Ошибка при экспорте', 'error');
    } finally {
      setGenerating(false);
    }
  };

  return (
    <div id="reports" className="tab-panel active">
      <div className="reports-section">
        <h3>Генерация отчётов</h3>
        <div className="report-options">
          <div className="report-option">
            <label>Тип отчёта:</label>
            <select value={reportType} onChange={(e) => setReportType(e.target.value)}>
              <option value="monthly">Ежемесячный отчёт</option>
              <option value="attendance">Отчёт по посещаемости</option>
              <option value="financial">Финансовый отчёт</option>
            </select>
          </div>
          <div className="report-option">
            <label>Период:</label>
            <input 
              type="month" 
              value={reportMonth} 
              onChange={(e) => setReportMonth(e.target.value)} 
            />
          </div>
          <button className="btn-primary" onClick={handleGenerateReport} disabled={generating}>
            {generating ? 'Генерация...' : '📄 Сгенерировать отчёт'}
          </button>
          <button className="btn-secondary" onClick={handleExportExcel} disabled={generating}>
            📊 Экспорт в Excel
          </button>
        </div>
      </div>
    </div>
  );
};

export default ReportsTab;
