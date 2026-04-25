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
        // Загружаем статистику для всех групп
        const statsPromises = groupsList.map(group => 
            getAttendanceStats(group.id, new Date().getFullYear(), new Date().getMonth() + 1)
        );
        
        const allStats = await Promise.all(statsPromises);
        
        // Собираем общую статистику
        let totalChildren = 0;
        let totalPresent = 0;
        let totalDays = 0;
        
        allStats.forEach((stat, index) => {
            totalChildren += stat.total_children || 0;
            totalPresent += stat.total_present || 0;
            totalDays += stat.total_days || 0;
        });
        
        const attendanceRate = totalDays > 0 ? ((totalPresent / (totalChildren * totalDays)) * 100).toFixed(1) : 0;
        
        // Обновляем карточки
        document.querySelector('.stat-card:nth-child(1) .stat-value').textContent = totalChildren;
        document.querySelector('.stat-card:nth-child(2) .stat-value').textContent = attendanceRate + '%';
        document.querySelector('.stat-card:nth-child(3) .stat-value').textContent = totalPresent;
        
        // Загружаем детальную таблицу
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
        
        // Получаем данные по всем группам
        const allAttendance = [];
        for (const group of groupsList) {
            const attendance = await getAttendance(group.id, year, month);
            const children = await getChildrenByGroup(group.id);
            
            children.forEach(child => {
                const childAttendance = attendance.filter(a => a.child_id === child.id);
                const present = childAttendance.filter(a => a.status === 'present').length;
                const total = childAttendance.length;
                const percentage = total > 0 ? ((present / total) * 100).toFixed(1) : 0;
                
                allAttendance.push({
                    name: `${child.last_name} ${child.first_name}`,
                    group: group.name,
                    present,
                    absent: total - present,
                    percentage
                });
            });
        }
        
        // Сортируем по проценту посещаемости
        allAttendance.sort((a, b) => b.percentage - a.percentage);
        
        // Рендерим таблицу
        const tbody = document.querySelector('.read-only-table tbody');
        tbody.innerHTML = '';
        
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
    // Убираем активный класс со всех кнопок
    document.querySelectorAll('.tab-btn').forEach(btn => {
        btn.classList.remove('active');
    });
    
    // Убираем активный класс со всех панелей
    document.querySelectorAll('.tab-panel').forEach(panel => {
        panel.classList.remove('active');
    });
    
    // Добавляем активный класс нужной кнопке
    event.target.classList.add('active');
    
    // Показываем нужную панель
    document.getElementById(tabName).classList.add('active');
    
    // Загружаем данные для вкладки
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
        
        // Получаем статистику по группам
        const groupStats = [];
        for (const group of groupsList) {
            const stats = await getAttendanceStats(group.id, year, month);
            groupStats.push({
                name: group.name,
                rate: stats.attendance_rate || 0
            });
        }
        
        // Обновляем столбчатую диаграмму
        const barWrapper = document.querySelector('.bar-chart-wrapper');
        barWrapper.innerHTML = '';
        
        groupStats.forEach(stat => {
            const height = stat.rate * 2; // Масштабируем
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
        
        // Загружаем данные за неделю для линейного графика
        await loadWeeklyStats();
        
    } catch (error) {
        console.error('Ошибка загрузки статистики:', error);
    }
}

// Загрузка недельной статистики
async function loadWeeklyStats() {
    try {
        // Здесь должен быть запрос к API за недельной статистикой
        // Пока используем демо-данные
        const weeklyData = [92, 88, 95, 90, 93, 85, 89];
        
        const svg = document.querySelector('.line-svg');
        const points = weeklyData.map((value, index) => {
            const x = 50 + index * 70;
            const y = 200 - value;
            return `${x},${y}`;
        });
        
        svg.querySelector('polyline').setAttribute('points', points.join(' '));
        
        // Обновляем кружки
        const circles = svg.querySelectorAll('circle');
        weeklyData.forEach((value, index) => {
            if (circles[index]) {
                circles[index].setAttribute('cy', 200 - value);
            }
        });
        
    } catch (error) {
        console.error('Ошибка загрузки недельной статистики:', error);
    }
}

// Загрузка AI прогнозов
async function loadAIPredictions() {
    try {
        if (groupsList.length === 0) return;
        
        // Получаем прогноз для первой группы (или можно для всех)
        const prediction = await getAIPrediction(groupsList[0].id);
        
        // Обновляем карточки с прогнозами
        const cards = document.querySelectorAll('.ai-card');
        
        if (prediction.disease_risk) {
            const riskLevel = prediction.disease_risk.toLowerCase();
            cards[0].className = `ai-card risk-${riskLevel}`;
            cards[0].querySelector('.ai-value').textContent = 
                riskLevel === 'low' ? 'Низкий' : riskLevel === 'medium' ? 'Средний' : 'Высокий';
            cards[0].querySelector('.ai-desc').textContent = prediction.disease_risk_description || '';
        }
        
        if (prediction.absence_risk) {
            const riskLevel = prediction.absence_risk.toLowerCase();
            cards[1].className = `ai-card risk-${riskLevel}`;
            cards[1].querySelector('.ai-value').textContent = 
                riskLevel === 'low' ? 'Низкий' : riskLevel === 'medium' ? 'Средний' : 'Высокий';
            cards[1].querySelector('.ai-desc').textContent = prediction.absence_risk_description || '';
        }
        
        if (prediction.transition_risk) {
            const riskLevel = prediction.transition_risk.toLowerCase();
            cards[2].className = `ai-card risk-${riskLevel}`;
            cards[2].querySelector('.ai-value').textContent = 
                riskLevel === 'low' ? 'Низкий' : riskLevel === 'medium' ? 'Средний' : 'Высокий';
            cards[2].querySelector('.ai-desc').textContent = prediction.transition_risk_description || '';
        }
        
        // Обновляем точность прогноза
        document.querySelector('.ai-info p:first-child').innerHTML = 
            `<strong>Точность прогноза:</strong> ${prediction.accuracy || 86}%`;
        
    } catch (error) {
        console.error('Ошибка загрузки AI прогноза:', error);
    }
}

// Генерация отчёта
async function generateReport() {
    const reportType = document.getElementById('reportType').value;
    const reportMonth = document.getElementById('reportMonth').value;
    
    try {
        // Маппинг типов отчётов
        const typeMap = {
            'Ежемесячный отчёт': 'monthly',
            'Отчёт по посещаемости': 'attendance',
            'Финансовый отчёт': 'financial'
        };
        
        const type = typeMap[reportType] || 'monthly';
        
        // Для каждой группы генерируем отчёт
        for (const group of groupsList) {
            await generateReport(type, group.id, reportMonth);
        }
        
        alert(`Отчёты успешно сгенерированы!\nТип: ${reportType}\nМесяц: ${reportMonth}`);
        
    } catch (error) {
        console.error('Ошибка генерации отчёта:', error);
        alert('Ошибка при генерации отчёта: ' + error.message);
    }
}

// Экспорт в Excel
async function exportToExcel() {
    const reportMonth = document.getElementById('reportMonth').value;
    
    try {
        for (const group of groupsList) {
            await exportToExcel(group.id, reportMonth);
        }
        alert('Экспорт в Excel завершен!');
    } catch (error) {
        console.error('Ошибка экспорта:', error);
        alert('Ошибка при экспорте: ' + error.message);
    }
}

// Выходыы
function logout() {
    clearToken();
    localStorage.removeItem('isLoggedIn');
    localStorage.removeItem('userRole');
    localStorage.removeItem('userName');
    window.location.href = 'index.html';
}