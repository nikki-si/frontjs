import React, { useState } from 'react';
import api from '../../services/api';

const ReportsTab = ({ groups, showNotification }) => {
  const [reportType, setReportType] = useState('Ежемесячный отчёт');
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
      const results = [];
      
      for (const group of groups) {
        try {
          let reportData = { group_name: group.name, group_id: group.id };
          
          if (reportType === 'Ежемесячный отчёт' || reportType === 'Отчёт по посещаемости') {
            const stats = await api.getAttendanceStats(group.id, parseInt(year), parseInt(month));
            reportData = { ...stats, ...reportData, report_type: 'attendance' };
          } else if (reportType === 'Финансовый отчёт') {
            const paymentReport = await api.getGroupPaymentReport(group.id, `${year}-${month}-01`);
            reportData = { ...paymentReport, ...reportData, report_type: 'financial' };
          }
          
          results.push(reportData);
        } catch (error) {
          results.push({ group_name: group.name, error: error.message });
        }
      }
      
      // Создаём HTML для печати
      const printWindow = window.open('', '_blank');
      printWindow.document.write(createPrintHTML(results, reportType, reportMonth, year, month));
      printWindow.document.close();
      
      printWindow.onload = function() {
        printWindow.print();
      };
      
      showNotification(`✅ Отчёт "${reportType}" за ${reportMonth} сформирован`, 'success');
    } catch (error) {
      console.error('Ошибка:', error);
      showNotification('Ошибка при генерации отчёта', 'error');
    } finally {
      setGenerating(false);
    }
  };

  const exportToExcel = async () => {
    if (!reportMonth) {
      showNotification('Выберите период для экспорта', 'error');
      return;
    }
    
    setGenerating(true);
    const [year, month] = reportMonth.split('-');
    const allData = [];
    
    for (const group of groups) {
      try {
        const stats = await api.getAttendanceStats(group.id, parseInt(year), parseInt(month));
        if (stats.by_day) {
          Object.entries(stats.by_day).forEach(([day, data]) => {
            const percent = ((data.present / data.total) * 100).toFixed(1);
            allData.push({
              'Группа': group.name,
              'Дата': `${day}.${month}.${year}`,
              'Присутствовало': data.present,
              'Всего детей': data.total,
              'Процент': `${percent}%`
            });
          });
        }
      } catch (error) {
        console.error(`Ошибка для группы ${group.id}:`, error);
      }
    }
    
    if (allData.length === 0) {
      showNotification('Нет данных для экспорта', 'error');
      setGenerating(false);
      return;
    }
    
    const headers = Object.keys(allData[0]);
    const csvRows = [headers.join(',')];
    
    for (const row of allData) {
      const values = headers.map(header => `"${String(row[header] || '').replace(/"/g, '""')}"`);
      csvRows.push(values.join(','));
    }
    
    const blob = new Blob(['\ufeff' + csvRows.join('\n')], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `attendance_report_${reportMonth}.csv`;
    a.click();
    URL.revokeObjectURL(url);
    
    showNotification('✅ Экспорт завершён!', 'success');
    setGenerating(false);
  };

  const createPrintHTML = (results, reportType, reportMonth, year, month) => {
    const monthNames = ['Январь', 'Февраль', 'Март', 'Апрель', 'Май', 'Июнь', 'Июль', 'Август', 'Сентябрь', 'Октябрь', 'Ноябрь', 'Декабрь'];
    const monthName = monthNames[parseInt(month) - 1];
    
    return `<!DOCTYPE html>
    <html>
    <head>
        <meta charset="UTF-8">
        <title>${reportType} - ${monthName} ${year}</title>
        <style>
            * { margin: 0; padding: 0; box-sizing: border-box; }
            body {
                font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
                background: white;
                color: #2d3748;
                padding: 30px;
            }
            .container { max-width: 1100px; margin: 0 auto; }
            .header {
                text-align: center;
                margin-bottom: 35px;
                padding: 25px;
                background: linear-gradient(135deg, #ffeef8 0%, #e8f4ff 100%);
                border-radius: 20px;
            }
            .header h1 {
                font-size: 28px;
                background: linear-gradient(135deg, #ffb6c1, #87ceeb);
                -webkit-background-clip: text;
                background-clip: text;
                color: transparent;
            }
            .date-info {
                display: flex;
                justify-content: center;
                gap: 15px;
                flex-wrap: wrap;
                margin-top: 15px;
            }
            .date-info span {
                background: white;
                padding: 5px 12px;
                border-radius: 20px;
                font-size: 12px;
            }
            .group-section {
                margin-bottom: 35px;
                break-inside: avoid;
            }
            .group-header {
                background: linear-gradient(135deg, #ffeef8, #e8f4ff);
                padding: 12px 20px;
                border-radius: 12px;
                margin-bottom: 20px;
                border-left: 4px solid #ffb6c1;
            }
            .stats-grid {
                display: grid;
                grid-template-columns: repeat(4, 1fr);
                gap: 15px;
                margin-bottom: 25px;
            }
            .stat-card {
                background: #f7fafc;
                border-radius: 12px;
                padding: 12px;
                text-align: center;
                border: 1px solid #e2e8f0;
            }
            .stat-card .stat-label { font-size: 11px; color: #718096; margin-bottom: 5px; }
            .stat-card .stat-value { font-size: 22px; font-weight: 700; }
            .data-table {
                width: 100%;
                border-collapse: collapse;
            }
            .data-table th {
                background: #2d3748;
                color: white;
                padding: 10px;
                text-align: left;
            }
            .data-table td {
                padding: 8px 10px;
                border-bottom: 1px solid #e2e8f0;
            }
            .text-green { color: #48bb78; font-weight: 600; }
            .text-orange { color: #ed8936; font-weight: 600; }
            .text-red { color: #f56565; font-weight: 600; }
            .footer { margin-top: 40px; text-align: center; font-size: 11px; color: #a0aec0; }
            @media print { body { print-color-adjust: exact; } }
        </style>
    </head>
    <body>
        <div class="container">
            <div class="header">
                <h1>📊 ${reportType}</h1>
                <div class="date-info">
                    <span>📅 ${monthName} ${year}</span>
                    <span>🕐 ${new Date().toLocaleString()}</span>
                </div>
            </div>
            ${results.map(result => {
              if (result.error) {
                return `<div class="error-block">❌ ${result.group_name}: ${result.error}</div>`;
              }
              if (result.report_type === 'attendance') {
                const rate = result.attendance_rate || 0;
                return `
                  <div class="group-section">
                    <div class="group-header"><h2>📋 ${result.group_name}</h2></div>
                    <div class="stats-grid">
                      <div class="stat-card"><div class="stat-label">Всего детей</div><div class="stat-value">${result.total_children || 0}</div></div>
                      <div class="stat-card"><div class="stat-label">Посещаемость</div><div class="stat-value">${rate}%</div></div>
                      <div class="stat-card"><div class="stat-label">Присутствий</div><div class="stat-value">${result.total_present || 0}</div></div>
                      <div class="stat-card"><div class="stat-label">Дней</div><div class="stat-value">${result.total_days || 0}</div></div>
                    </div>
                    <table class="data-table">
                      <thead><tr><th>День</th><th>Присутствовало</th><th>Всего</th><th>%</th></tr></thead>
                      <tbody>
                        ${result.by_day ? Object.entries(result.by_day).map(([day, data]) => {
                          const percent = ((data.present / data.total) * 100).toFixed(1);
                          return `<tr><td><strong>${day}</strong></td><td>${data.present}</td><td>${data.total}</td><td>${percent}%</td></tr>`;
                        }).join('') : '<tr><td colspan="4">Нет данных</td></tr>'}
                      </tbody>
                    </table>
                  </div>
                `;
              }
              if (result.report_type === 'financial') {
                return `
                  <div class="group-section">
                    <div class="group-header"><h2>💰 ${result.group_name}</h2></div>
                    <div class="stats-grid" style="grid-template-columns: repeat(3, 1fr);">
                      <div class="stat-card"><div class="stat-label">Общая сумма</div><div class="stat-value">${(result.total_amount || 0).toLocaleString()} ₽</div></div>
                      <div class="stat-card"><div class="stat-label">Оплачено</div><div class="stat-value text-green">${(result.total_paid || 0).toLocaleString()} ₽</div></div>
                      <div class="stat-card"><div class="stat-label">Задолженность</div><div class="stat-value text-red">${(result.total_balance || 0).toLocaleString()} ₽</div></div>
                    </div>
                    <table class="data-table">
                      <thead><tr><th>Ребёнок</th><th>Сумма</th><th>Оплачено</th><th>Баланс</th><th>Статус</th></tr></thead>
                      <tbody>
                        ${result.payments && result.payments.length > 0 ? result.payments.map(p => {
                          let statusClass = '', statusText = '';
                          if (p.status === 'paid') { statusClass = 'text-green'; statusText = '✅ Оплачено'; }
                          else if (p.status === 'pending') { statusClass = 'text-orange'; statusText = '⏳ Ожидает'; }
                          else { statusClass = 'text-red'; statusText = '⚠️ Просрочено'; }
                          return `<tr><td><strong>${p.child_name}</strong></td><td>${(p.amount || 0).toLocaleString()} ₽</td><td>${(p.paid_amount || 0).toLocaleString()} ₽</td><td>${(p.balance || 0).toLocaleString()} ₽</td><td class="${statusClass}">${statusText}</td></tr>`;
                        }).join('') : '<tr><td colspan="5">Нет данных</td></tr>'}
                      </tbody>
                    </table>
                  </div>
                `;
              }
              return '';
            }).join('')}
            <div class="footer">© Детский сад - Система учёта посещаемости</div>
        </div>
    </body>
    </html>`;
  };

  return (
    <div id="reports" className="tab-panel active">
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
          <button className="btn-secondary" onClick={exportToExcel} disabled={generating}>
            📊 Экспорт в Excel
          </button>
        </div>
      </div>
    </div>
  );
};

export default ReportsTab;
