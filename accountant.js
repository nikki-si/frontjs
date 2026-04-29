// Глобальные переменные
let groupsList = [];
let currentReportType = 'monthly';
let statisticsData = {};

// Инициализация
document.addEventListener('DOMContentLoaded', async function() {
    loadAccountantInfo();
    await loadGroups();
    await loadDashboardData();
});

// Загрузка информации бухгалтера
function loadAccountantInfo() {
    const userName = localStorage.getItem('userName') || 'Петрова Анна Сергеевна';
    document.getElementById('accountantName').textContent = userName;
}

// Загрузка списка групп
async function loadGroups() {
    try {
        groupsList = await getGroups();
    } catch (error) {
        console.error('Ошибка загрузки групп:', error);
    }
}

// Загрузка данных для дашборда
async function loadDashboardData() {
    try {
        const year = new Date().getFullYear();
        const month = new Date().getMonth() + 1;
        
        let totalChildren = 0;
        let totalPresent = 0;
        let sumOfRates = 0;
        let groupsCount = 0;
        
        for (const group of groupsList) {
            try {
                const stats = await getAttendanceStats(group.id, year, month);
                console.log(`Группа ${group.name}: ${stats.attendance_rate}%`);
                
                totalChildren += stats.total_children || 0;
                totalPresent += stats.total_present || 0;
                
                if (stats.attendance_rate > 0) {
                    sumOfRates += stats.attendance_rate;
                    groupsCount++;
                }
            } catch (error) {
                console.error(`Ошибка группы ${group.id}:`, error);
            }
        }
        
        const attendanceRate = groupsCount > 0 ? (sumOfRates / groupsCount).toFixed(1) : 0;
        
        document.querySelector('.stat-card:nth-child(1) .stat-value').textContent = totalChildren;
        document.querySelector('.stat-card:nth-child(2) .stat-value').textContent = attendanceRate + '%';
        document.querySelector('.stat-card:nth-child(3) .stat-value').textContent = totalPresent;
        
        await loadJournalTable();
        
    } catch (error) {
        console.error('Ошибка загрузки данных:', error);
    }
}

// Загрузка таблицы журнала
async function loadJournalTable() {
    try {
        const year = new Date().getFullYear();
        const month = new Date().getMonth() + 1;
        
        const allAttendance = [];
        for (const group of groupsList) {
            try {
                const attendance = await getAttendance(group.id, year, month);
                const children = await getChildrenByGroup(group.id);
                
                children.forEach(child => {
                    const childAttendance = attendance.filter(a => a.child_id === child.id);
                    const present = childAttendance.filter(a => a.status === 'present').length;
                    const total = childAttendance.length;
                    const percentage = total > 0 ? ((present / total) * 100).toFixed(1) : 0;
                    
                    const childName = child.full_name || child.name || `Ребёнок ID:${child.id}`;
                    
                    allAttendance.push({
                        name: childName,
                        group: group.name,
                        present: present,
                        absent: total - present,
                        percentage: percentage
                    });
                });
            } catch (error) {
                console.error(`Ошибка обработки группы ${group.id}:`, error);
            }
        }
        
        allAttendance.sort((a, b) => b.percentage - a.percentage);
        
        const tbody = document.querySelector('.read-only-table tbody');
        if (!tbody) return;
        
        tbody.innerHTML = '';
        
        if (allAttendance.length === 0) {
            tbody.innerHTML = '<tr><td colspan="5" style="text-align: center;">Нет данных о посещаемости</td></tr>';
            return;
        }
        
        allAttendance.forEach(item => {
            const row = document.createElement('tr');
            row.innerHTML = `
                <td>${item.name}</td>
                <td>${item.group}</td>
                <td>${item.present}</td>
                <td>${item.absent}</td>
                <td>${item.percentage}%</td>
            `;
            tbody.appendChild(row);
        });
        
    } catch (error) {
        console.error('Ошибка загрузки таблицы:', error);
    }
}

// Переключение вкладок
function switchTab(tabName) {
    document.querySelectorAll('.tab-btn').forEach(btn => {
        btn.classList.remove('active');
    });
    
    document.querySelectorAll('.tab-panel').forEach(panel => {
        panel.classList.remove('active');
    });
    
    event.target.classList.add('active');
    document.getElementById(tabName).classList.add('active');
    
    if (tabName === 'statistics') {
        loadStatisticsTab();
    } else if (tabName === 'ai') {
        loadAIPredictions();
    }
}

// Загрузка вкладки статистики
async function loadStatisticsTab() {
    try {
        const year = new Date().getFullYear();
        const month = new Date().getMonth() + 1;
        
        const groupStats = [];
        for (const group of groupsList) {
            const stats = await getAttendanceStats(group.id, year, month);
            groupStats.push({
                name: group.name,
                rate: stats.attendance_rate || 0
            });
        }
        
        const barWrapper = document.querySelector('.bar-chart-wrapper');
        barWrapper.innerHTML = '';
        
        groupStats.forEach(stat => {
            const height = Math.max(stat.rate * 2, 20);
            const barItem = document.createElement('div');
            barItem.className = 'bar-item';
            barItem.innerHTML = `
                <div class="bar" style="height: ${height}px;">
                    <span class="bar-value-inside">${stat.rate.toFixed(1)}%</span>
                </div>
                <span class="bar-label">${stat.name}</span>
            `;
            barWrapper.appendChild(barItem);
        });
        
        await loadWeeklyStats();
        
    } catch (error) {
        console.error('Ошибка загрузки статистики:', error);
    }
}

// Загрузка недельной статистики
async function loadWeeklyStats() {
    try {
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
        
        for (const group of groupsList) {
            for (const date of dates) {
                try {
                    const journal = await getDailyJournal(group.id, date);
                    if (journal && journal.records) {
                        const presentCount = journal.records.filter(r => r.status === 'present').length;
                        dailyStats[date].present += presentCount;
                        dailyStats[date].total += journal.total_children;
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
        
        const svg = document.querySelector('.line-svg');
        if (svg) {
            const polyline = svg.querySelector('polyline');
            const circles = svg.querySelectorAll('circle');
            
            const width = 500;
            const height = 200;
            const padding = 50;
            const step = (width - padding * 2) / (weeklyRates.length - 1);
            const maxRate = Math.max(...weeklyRates, 100);
            
            const points = weeklyRates.map((rate, index) => {
                const x = padding + index * step;
                const y = height - padding - (rate / maxRate) * (height - padding * 2);
                return `${x},${y}`;
            }).join(' ');
            
            polyline.setAttribute('points', points);
            
            weeklyRates.forEach((rate, index) => {
                if (circles[index]) {
                    const x = padding + index * step;
                    const y = height - padding - (rate / maxRate) * (height - padding * 2);
                    circles[index].setAttribute('cx', x);
                    circles[index].setAttribute('cy', y);
                    circles[index].setAttribute('title', `${weekdays[index]}: ${rate.toFixed(1)}%`);
                }
            });
        }
        
        const labelsContainer = document.querySelector('.line-labels');
        if (labelsContainer) {
            labelsContainer.innerHTML = weekdays.map(day => `<span>${day}</span>`).join('');
        }
        
    } catch (error) {
        console.error('Ошибка загрузки недельной статистики:', error);
    }
}

// Загрузка AI прогнозов
async function loadAIPredictions() {
    try {
        if (groupsList.length === 0) return;
        
        let totalDiseaseRisk = 0;
        let totalAbsenceRisk = 0;
        let totalTransitionRisk = 0;
        let totalAccuracy = 0;
        let validPredictions = 0;
        
        for (const group of groupsList) {
            try {
                const prediction = await getAIPrediction(group.id);
                
                const riskToNumber = (risk) => {
                    const r = (risk || 'medium').toLowerCase();
                    if (r === 'low') return 1;
                    if (r === 'high') return 3;
                    return 2;
                };
                
                totalDiseaseRisk += riskToNumber(prediction.disease_risk);
                totalAbsenceRisk += riskToNumber(prediction.absence_risk);
                totalTransitionRisk += riskToNumber(prediction.transition_risk);
                totalAccuracy += prediction.accuracy || 86;
                validPredictions++;
                
            } catch (error) {
                console.error(`Ошибка AI прогноза для группы ${group.id}:`, error);
            }
        }
        
        if (validPredictions === 0) return;
        
        const avgDiseaseRisk = totalDiseaseRisk / validPredictions;
        const avgAbsenceRisk = totalAbsenceRisk / validPredictions;
        const avgTransitionRisk = totalTransitionRisk / validPredictions;
        const avgAccuracy = Math.round(totalAccuracy / validPredictions);
        
        const getRiskLevel = (avgValue) => {
            if (avgValue <= 1.5) return 'low';
            if (avgValue >= 2.5) return 'high';
            return 'medium';
        };
        
        const diseaseRisk = getRiskLevel(avgDiseaseRisk);
        const absenceRisk = getRiskLevel(avgAbsenceRisk);
        const transitionRisk = getRiskLevel(avgTransitionRisk);
        
        const cards = document.querySelectorAll('.ai-card');
        
        if (cards[0]) {
            cards[0].className = `ai-card risk-${diseaseRisk}`;
            cards[0].querySelector('.ai-value').textContent = 
                diseaseRisk === 'low' ? 'Низкий' : diseaseRisk === 'medium' ? 'Средний' : 'Высокий';
            
            const descMap = {
                low: 'Стабильная ситуация по всем группам',
                medium: 'Есть группы с повышенным риском',
                high: 'Критическая ситуация, требуется внимание'
            };
            cards[0].querySelector('.ai-desc').textContent = descMap[diseaseRisk];
        }
        
        if (cards[1]) {
            cards[1].className = `ai-card risk-${absenceRisk}`;
            cards[1].querySelector('.ai-value').textContent = 
                absenceRisk === 'low' ? 'Низкий' : absenceRisk === 'medium' ? 'Средний' : 'Высокий';
            
            const descMap = {
                low: 'Ожидаемая посещаемость в норме',
                medium: 'Прогнозируются пропуски в некоторых группах',
                high: 'Высокая вероятность массовых пропусков'
            };
            cards[1].querySelector('.ai-desc').textContent = descMap[absenceRisk];
        }
        
        if (cards[2]) {
            cards[2].className = `ai-card risk-${transitionRisk}`;
            cards[2].querySelector('.ai-value').textContent = 
                transitionRisk === 'low' ? 'Низкий' : transitionRisk === 'medium' ? 'Средний' : 'Высокий';
            
            const descMap = {
                low: 'Адаптация детей проходит нормально',
                medium: 'Требуется наблюдение за переходными группами',
                high: 'Срочно требуется внимание к адаптации'
            };
            cards[2].querySelector('.ai-desc').textContent = descMap[transitionRisk];
        }
        
        const accuracyElement = document.querySelector('.ai-info p:first-child');
        if (accuracyElement) {
            accuracyElement.innerHTML = `<strong>Точность прогноза:</strong> ${avgAccuracy}% (на основе ${validPredictions} групп)`;
        }
        
    } catch (error) {
        console.error('Ошибка загрузки AI прогноза:', error);
    }
}

// Генерация PDF отчёта (рабочий вариант как в самом начале)
async function generatePDF() {
    const reportType = document.getElementById('reportType').value;
    const reportMonth = document.getElementById('reportMonth').value;
    
    if (!reportMonth) {
        alert('Выберите период для отчёта');
        return;
    }
    
    const [year, month] = reportMonth.split('-');
    const apiMonth = `${year}-${month}-01`;
    
    try {
        showLoading(true);
        
        let results = [];
        
        for (const group of groupsList) {
            try {
                let reportData = { group_name: group.name, group_id: group.id };
                
                if (reportType === 'Ежемесячный отчёт' || reportType === 'Отчёт по посещаемости') {
                    const stats = await getAttendanceStats(group.id, parseInt(year), parseInt(month));
                    reportData = { ...stats, ...reportData };
                    reportData.report_type = 'attendance';
                } else if (reportType === 'Финансовый отчёт') {
                    const paymentReport = await getGroupPaymentReport(group.id, apiMonth);
                    reportData = { ...paymentReport, ...reportData };
                    reportData.report_type = 'financial';
                }
                
                results.push(reportData);
            } catch (error) {
                results.push({
                    group_name: group.name,
                    error: error.message,
                    report_type: reportType === 'Финансовый отчёт' ? 'financial' : 'attendance'
                });
            }
        }
        
        const printWindow = window.open('', '_blank');
        printWindow.document.write(createPrintHTML(results, reportType, reportMonth, year, month));
        printWindow.document.close();
        
        printWindow.onload = function() {
            printWindow.print();
        };
        
    } catch (error) {
        console.error('Ошибка:', error);
        alert('Ошибка: ' + error.message);
    } finally {
        showLoading(false);
    }
}

// Создание HTML для печати (красивые стили как в первый раз)
function createPrintHTML(results, reportType, reportMonth, year, month) {
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
            
            /* Шапка */
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
            .header .subtitle { color: #718096; font-size: 14px; margin: 10px 0; }
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
                color: #2d3748;
            }
            
            /* Блок группы */
            .group-section {
                margin-bottom: 35px;
                break-inside: avoid;
                page-break-inside: avoid;
            }
            .group-header {
                background: linear-gradient(135deg, #ffeef8, #e8f4ff);
                padding: 12px 20px;
                border-radius: 12px;
                margin-bottom: 20px;
                border-left: 4px solid #ffb6c1;
            }
            .group-header h2 { margin: 0; font-size: 18px; color: #2d3748; }
            
            /* Карточки */
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
            .stat-card .stat-label { font-size: 11px; color: #718096; text-transform: uppercase; margin-bottom: 5px; }
            .stat-card .stat-value { font-size: 22px; font-weight: 700; color: #2d3748; }
            .stat-value.high { color: #48bb78; }
            .stat-value.medium { color: #ed8936; }
            .stat-value.low { color: #f56565; }
            
            /* Таблицы */
            .data-table {
                width: 100%;
                border-collapse: collapse;
                border-radius: 12px;
                overflow: hidden;
            }
            .data-table th {
                background: #2d3748;
                color: white;
                padding: 10px 12px;
                font-size: 13px;
                text-align: left;
            }
            .data-table td {
                padding: 8px 12px;
                border-bottom: 1px solid #e2e8f0;
                font-size: 12px;
            }
            .text-green { color: #48bb78; font-weight: 600; }
            .text-orange { color: #ed8936; font-weight: 600; }
            .text-red { color: #f56565; font-weight: 600; }
            
            /* Футер */
            .footer {
                margin-top: 40px;
                padding-top: 15px;
                text-align: center;
                border-top: 1px solid #e2e8f0;
                font-size: 11px;
                color: #a0aec0;
            }
            .error-block {
                background: #fff5f5;
                border: 1px solid #f56565;
                border-radius: 12px;
                padding: 15px;
                margin-bottom: 20px;
                color: #c53030;
            }
            
            @media print {
                body { print-color-adjust: exact; -webkit-print-color-adjust: exact; }
                .group-section { break-inside: avoid; page-break-inside: avoid; }
            }
        </style>
    </head>
    <body>
        <div class="container">
            <div class="header">
                <h1>📊 ${reportType}</h1>
                <div class="subtitle">Детский сад - Система учёта посещаемости</div>
                <div class="date-info">
                    <span>📅 ${monthName} ${year}</span>
                    <span>🕐 ${new Date().toLocaleString()}</span>
                    <span>🏫 ${results.length} групп</span>
                </div>
            </div>
            
            ${results.map(result => {
                if (result.error) {
                    return `<div class="error-block"><strong>❌ ${result.group_name}</strong>: ${result.error}</div>`;
                }
                
                if (result.report_type === 'attendance') {
                    const rate = result.attendance_rate || 0;
                    const rateClass = rate >= 80 ? 'high' : (rate >= 50 ? 'medium' : 'low');
                    
                    return `
                        <div class="group-section">
                            <div class="group-header"><h2>📋 ${result.group_name}</h2></div>
                            <div class="stats-grid">
                                <div class="stat-card"><div class="stat-label">Всего детей</div><div class="stat-value">${result.total_children || 0}</div></div>
                                <div class="stat-card"><div class="stat-label">Посещаемость</div><div class="stat-value ${rateClass}">${rate}%</div></div>
                                <div class="stat-card"><div class="stat-label">Присутствий</div><div class="stat-value">${result.total_present || 0}</div></div>
                                <div class="stat-card"><div class="stat-label">Дней</div><div class="stat-value">${result.total_days || 0}</div></div>
                            </div>
                            ${result.by_day && Object.keys(result.by_day).length > 0 ? `
                                <table class="data-table">
                                    <thead><tr><th>День</th><th>Присутствовало</th><th>Всего</th><th>%</th></tr></thead>
                                    <tbody>
                                        ${Object.entries(result.by_day).map(([day, data]) => {
                                            const percent = ((data.present / data.total) * 100).toFixed(1);
                                            const percentClass = percent >= 80 ? 'text-green' : (percent >= 50 ? 'text-orange' : 'text-red');
                                            return `<tr><td><strong>${day}</strong></td><td>${data.present}</td><td>${data.total}</td><td class="${percentClass}">${percent}%</td></tr>`;
                                        }).join('')}
                                    </tbody>
                                </table>
                            ` : '<p style="color:#718096;">Нет данных по дням</p>'}
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
                                        return `<tr><td><strong>${p.child_name || '—'}</strong></td><td>${(p.amount || 0).toLocaleString()} ₽</td><td>${(p.paid_amount || 0).toLocaleString()} ₽</td><td>${(p.balance || 0).toLocaleString()} ₽</td><td class="${statusClass}">${statusText}</td></tr>`;
                                    }).join('') : '<tr><td colspan="5" style="text-align:center;">Нет данных</td></tr>'}
                                </tbody>
                            </table>
                        </div>
                    `;
                }
                return '';
            }).join('')}
            
            <div class="footer">
                <p>© Детский сад - Система учёта посещаемости</p>
            </div>
        </div>
    </body>
    </html>`;
}

// Экспорт в Excel
async function exportReportToExcel() {
    const reportMonth = document.getElementById('reportMonth')?.value;
    if (!reportMonth) {
        alert('Выберите период для экспорта');
        return;
    }
    
    const [year, month] = reportMonth.split('-');
    
    try {
        showLoading(true);
        let allData = [];
        
        for (const group of groupsList) {
            try {
                const stats = await getAttendanceStats(group.id, parseInt(year), parseInt(month));
                
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
            alert('Нет данных для экспорта');
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
        
        alert(`✅ Экспорт завершён!`);
        
    } catch (error) {
        console.error('Ошибка экспорта:', error);
        alert('❌ Ошибка при экспорте: ' + error.message);
    } finally {
        showLoading(false);
    }
}

// Показать загрузку
function showLoading(show) {
    let loader = document.getElementById('global-loader');
    
    if (show) {
        if (!loader) {
            loader = document.createElement('div');
            loader.id = 'global-loader';
            loader.style.cssText = `
                position: fixed; top: 0; left: 0; width: 100%; height: 100%;
                background: rgba(0,0,0,0.5); z-index: 9999;
                display: flex; align-items: center; justify-content: center;
            `;
            loader.innerHTML = `
                <div style="background: white; padding: 20px 40px; border-radius: 20px; text-align: center;">
                    <div style="width: 40px; height: 40px; border: 4px solid #e2e8f0; border-top-color: #ffb6c1; border-radius: 50%; animation: spin 1s linear infinite;"></div>
                    <span style="margin-top: 10px; display: block;">Загрузка...</span>
                </div>
            `;
            document.body.appendChild(loader);
            
            if (!document.querySelector('#loader-style')) {
                const style = document.createElement('style');
                style.id = 'loader-style';
                style.textContent = '@keyframes spin { to { transform: rotate(360deg); } }';
                document.head.appendChild(style);
            }
        }
        loader.style.display = 'flex';
    } else {
        if (loader) loader.style.display = 'none';
    }
}

// Выход
function logout() {
    clearToken();
    localStorage.removeItem('isLoggedIn');
    localStorage.removeItem('userRole');
    localStorage.removeItem('userName');
    window.location.href = 'index.html';
}