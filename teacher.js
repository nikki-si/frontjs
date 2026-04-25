// ===== ГЛОБАЛЬНЫЕ ПЕРЕМЕННЫЕ =====
let currentDate = new Date();
let currentGroupId = localStorage.getItem('currentGroup') || null;
let childrenList = [];
let attendanceData = {};
let groupsList = [];
let isSaving = false; // Флаг для предотвращения дублирующих запросов

// ===== ИНИЦИАЛИЗАЦИЯ =====
document.addEventListener('DOMContentLoaded', async function() {
    try {
        // 🔐 Проверка авторизации
        if (!checkAuth('teacher')) return;
        
        loadTeacherInfo();
        await loadGroups();
        
        // Если есть выбранная группа — загружаем детей, иначе показываем пустое состояние
        if (currentGroupId && groupsList.find(g => g.id == currentGroupId)) {
            await loadChildren();
        } else if (groupsList.length > 0) {
            // Автовыбор первой доступной группы
            currentGroupId = groupsList[0].id;
            localStorage.setItem('currentGroup', currentGroupId);
            await loadChildren();
        }
        
        updateMonthDisplay();
        setupEventListeners();
        
    } catch (error) {
        console.error('Ошибка инициализации:', error);
        handleApiError(error);
    }
});

// ===== ПРОВЕРКА АВТОРИЗАЦИИ =====
function checkAuth(requiredRole = null) {
    const token = localStorage.getItem('jwt_token');
    const isLoggedIn = localStorage.getItem('isLoggedIn') === 'true';
    const userRole = localStorage.getItem('userRole')?.toLowerCase();
    
    if (!token || !isLoggedIn) {
        showNotification('⏰ Пожалуйста, войдите в систему', 'error');
        setTimeout(() => window.location.href = 'index.html', 1500);
        return false;
    }
    
    if (requiredRole && !hasRole(requiredRole)) {
        showNotification('🔒 Недостаточно прав для доступа', 'error');
        setTimeout(() => {
            clearToken();
            window.location.href = 'index.html';
        }, 1500);
        return false;
    }
    
    return true;
}

function hasRole(requiredRole) {
    const userRole = localStorage.getItem('userRole')?.toLowerCase();
    const roleMap = {
        'admin': ['admin'],
        'teacher': ['admin', 'teacher'],
        'accountant': ['admin', 'accountant']
    };
    return roleMap[requiredRole]?.includes(userRole) || false;
}

// ===== ЗАГРУЗКА ДАННЫХ =====

// Загрузка информации воспитателя
function loadTeacherInfo() {
    const userName = localStorage.getItem('userName') || 'Воспитатель';
    const userEmail = localStorage.getItem('userEmail') || '';
    const nameEl = document.getElementById('teacherName');
    if (nameEl) {
        nameEl.textContent = userName;
        nameEl.title = userEmail;
    }
}

// Загрузка списка групп (для учителя — только свои)
async function loadGroups() {
    try {
        // Учителя видят только свои группы
        groupsList = await getMyGroups();
        
        const select = document.getElementById('groupSelect');
        if (!select) return;
        
        select.innerHTML = '';
        
        if (!groupsList || groupsList.length === 0) {
            select.innerHTML = '<option value="">Нет доступных групп</option>';
            select.disabled = true;
            showNotification('ℹ️ У вас пока нет назначенных групп', 'info');
            return;
        }
        
        select.disabled = false;
        
        groupsList.forEach(group => {
            const option = document.createElement('option');
            option.value = group.id;
            option.textContent = group.name;
            if (group.id == currentGroupId) {
                option.selected = true;
            }
            select.appendChild(option);
        });
        
        // Если текущая группа не в списке — берём первую
        if (!groupsList.find(g => g.id == currentGroupId)) {
            currentGroupId = groupsList[0].id;
            localStorage.setItem('currentGroup', currentGroupId);
        }
        
    } catch (error) {
        console.error('Ошибка загрузки групп:', error);
        handleApiError(error);
        
        const select = document.getElementById('groupSelect');
        if (select) {
            select.innerHTML = '<option value="">Ошибка загрузки</option>';
            select.disabled = true;
        }
    }
}

// Загрузка детей выбранной группы
async function loadChildren(visitedGroups = new Set()) {
    if (!currentGroupId) {
        childrenList = [];
        renderTable();
        return;
    }
    
    // Защита от бесконечной рекурсии
    if (visitedGroups.has(currentGroupId)) {
        showNotification('🔒 Нет доступа ни к одной из групп', 'error');
        childrenList = [];
        renderTable();
        return;
    }
    
    visitedGroups.add(currentGroupId);
    
    try {
        childrenList = await getChildrenByGroup(currentGroupId);
        await loadAttendance();
    } catch (error) {
        console.error('Ошибка загрузки детей:', error);
        handleApiError(error);
        
        if (error.code === 403) {
            // Нет доступа к группе — пробуем переключиться
            const availableGroup = groupsList.find(g => 
                g.id != currentGroupId && !visitedGroups.has(g.id)
            );
            
            if (availableGroup) {
                currentGroupId = availableGroup.id;
                localStorage.setItem('currentGroup', currentGroupId);
                const select = document.getElementById('groupSelect');
                if (select) select.value = currentGroupId;
                
                // Рекурсивный вызов с тем же набором visitedGroups
                await loadChildren(visitedGroups);
                return;
            }
            showNotification('🔒 Нет доступа к выбранной группе', 'error');
        } else {
            showNotification('Ошибка загрузки списка детей', 'error');
        }
        
        childrenList = [];
        renderTable();
    }
}

// Загрузка посещаемости за текущий месяц
async function loadAttendance() {
    if (!currentGroupId || childrenList.length === 0) {
        renderTable();
        return;
    }
    
    const year = currentDate.getFullYear();
    const month = currentDate.getMonth() + 1;
    
    try {
        const data = await getAttendance(currentGroupId, year, month);
        
        // Преобразуем в удобный формат: { "childId-day": "status" }
        attendanceData = {};
        if (data && Array.isArray(data)) {
            data.forEach(record => {
                const day = new Date(record.date).getDate();
                const key = `${record.child_id}-${day}`;
                attendanceData[key] = record.status?.toLowerCase() || 'not_marked';
            });
        }
        
        renderTable();
    } catch (error) {
        console.error('Ошибка загрузки посещаемости:', error);
        // 404 — нормально, просто нет записей за этот период
        if (error.code !== 404) {
            handleApiError(error);
        }
        renderTable(); // Рендерим с пустыми данными
    }
}

// ===== ОТРИСОВКА ТАБЛИЦЫ =====
function renderTable() {
    const tableBody = document.getElementById('tableBody');
    const tableHead = document.querySelector('.attendance-table thead tr');
    
    if (!tableBody || !tableHead) return;
    
    tableBody.innerHTML = '';
    
    // Очищаем заголовки дат (оставляем первую колонку "ФИО")
    while (tableHead.children.length > 1) {
        tableHead.removeChild(tableHead.lastChild);
    }
    
    const daysInMonth = new Date(
        currentDate.getFullYear(), 
        currentDate.getMonth() + 1, 
        0
    ).getDate();
    
    const today = new Date();
    const isCurrentMonth = today.getFullYear() === currentDate.getFullYear() && 
                          today.getMonth() === currentDate.getMonth();
    
    // Добавляем заголовки с датами
    for (let day = 1; day <= daysInMonth; day++) {
        const th = document.createElement('th');
        const date = new Date(currentDate.getFullYear(), currentDate.getMonth(), day);
        const dayOfWeek = ['Вс', 'Пн', 'Вт', 'Ср', 'Чт', 'Пт', 'Сб'][date.getDay()];
        
        th.innerHTML = `${day}<br><small>${dayOfWeek}</small>`;
        th.style.fontSize = '12px';
        th.style.lineHeight = '1.3';
        
        // Подсвечиваем сегодняшний день
        if (isCurrentMonth && day === today.getDate()) {
            th.style.background = '#fff3cd';
            th.title = 'Сегодня';
        }
        
        tableHead.appendChild(th);
    }
    
    // Если нет детей — показываем сообщение
    if (!childrenList || childrenList.length === 0) {
        const row = document.createElement('tr');
        const cell = document.createElement('td');
        cell.colSpan = daysInMonth + 1;
        cell.textContent = '👶 В этой группе пока нет детей';
        cell.style.textAlign = 'center';
        cell.style.padding = '30px';
        cell.style.color = '#718096';
        row.appendChild(cell);
        tableBody.appendChild(row);
        updateSummary(daysInMonth);
        return;
    }
    
    // Добавляем строки с детьми
    childrenList.forEach(child => {
        const row = document.createElement('tr');
        
        // ФИО ребенка
        const nameCell = document.createElement('td');
        nameCell.textContent = child.full_name || child.name || 'Без имени';
        nameCell.className = 'name-col';
        nameCell.title = child.birth_date ? `Дата рождения: ${child.birth_date}` : '';
        row.appendChild(nameCell);
        
        // Ячейки с датами
        for (let day = 1; day <= daysInMonth; day++) {
            const cell = document.createElement('td');
            const key = `${child.id}-${day}`;
            const status = attendanceData[key] || 'not_marked';
             
            const btn = document.createElement('button');
            btn.className = `attendance-btn ${getStatusClass(status)}`;
            btn.textContent = getStatusSymbol(status);
            btn.title = getStatusTitle(status);
            btn.onclick = (e) => {
                e.stopPropagation();
                toggleAttendance(child.id, day, btn);
            };
            
            // Заблокировать редактирование будущих дат
            const cellDate = new Date(currentDate.getFullYear(), currentDate.getMonth(), day);
            if (cellDate > today && isCurrentMonth) {
                btn.disabled = true;
                btn.style.opacity = '0.5';
                btn.style.cursor = 'not-allowed';
            }
            
            cell.appendChild(btn);
            row.appendChild(cell);
        }
        
        tableBody.appendChild(row);
    });
    
    updateSummary(daysInMonth);
}

// Вспомогательные функции для статусов
function getStatusClass(status) {
    const map = {
        'present': 'present',
        'absent': 'absent',
        'sick': 'sick',
        'not_marked': 'empty'
    };
    return map[status?.toLowerCase()] || 'empty';
}

function getStatusSymbol(status) {
    const map = {
        'present': '✓',
        'absent': '✗',
        'sick': '🤒',
        'not_marked': '○'
    };
    return map[status?.toLowerCase()] || '○';
}

function getStatusTitle(status) {
    const map = {
        'present': 'Присутствует',
        'absent': 'Отсутствует',
        'sick': 'Болеет',
        'not_marked': 'Не отмечен'
    };
    return map[status?.toLowerCase()] || 'Неизвестно';
}

// ===== ОБРАБОТКА ПОСЕЩАЕМОСТИ =====

// Переключение статуса посещаемости
async function toggleAttendance(childId, day, btn) {
    if (isSaving) return;
    
    const year = currentDate.getFullYear();
    const month = currentDate.getMonth() + 1;
    const dateStr = `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
    
    // Циклическое переключение: not_marked → present → absent → sick → not_marked
    const currentStatus = attendanceData[`${childId}-${day}`] || 'not_marked';
    const statusCycle = ['not_marked', 'present', 'absent', 'sick'];
    const currentIndex = statusCycle.indexOf(currentStatus);
    const newStatus = statusCycle[(currentIndex + 1) % statusCycle.length];
    
    // Оптимистичное обновление UI
    const oldStatus = currentStatus;
    btn.className = `attendance-btn ${getStatusClass(newStatus)}`;
    btn.textContent = getStatusSymbol(newStatus);
    btn.title = getStatusTitle(newStatus);
    attendanceData[`${childId}-${day}`] = newStatus;
    
    isSaving = true;
    
    try {
        await markAttendance(childId, dateStr, newStatus);
        updateSummary(new Date(year, month, 0).getDate());
        showNotification('✅ Сохранено', 'success');
    } catch (error) {
        console.error('Ошибка сохранения:', error);
        handleApiError(error);
        
        // Откат изменений
        btn.className = `attendance-btn ${getStatusClass(oldStatus)}`;
        btn.textContent = getStatusSymbol(oldStatus);
        btn.title = getStatusTitle(oldStatus);
        attendanceData[`${childId}-${day}`] = oldStatus;
        showNotification('❌ Не удалось сохранить', 'error');
    } finally {
        isSaving = false;
    }
}

// Массовая отметка присутствия (сегодня)
async function markAllPresent() {
    await markAllWithStatus('present');
}

// Массовая отметка отсутствия (сегодня)
async function markAllAbsent() {
    await markAllWithStatus('absent');
}

// Массовая отметка "болеет"
async function markAllSick() {
    await markAllWithStatus('sick');
}

async function markAllWithStatus(status) {
    if (isSaving) return;
    
    const today = new Date();
    const isCurrentMonth = today.getFullYear() === currentDate.getFullYear() &&
                          today.getMonth() === currentDate.getMonth();
    
    if (!isCurrentMonth) {
        showNotification('⚠️ Массовая отметка доступна только для текущего месяца', 'warning');
        return;
    }
    
    if (!childrenList || childrenList.length === 0) {
        showNotification('ℹ️ В группе нет детей', 'info');
        return;
    }
    
    const day = today.getDate();
    const year = currentDate.getFullYear();
    const month = currentDate.getMonth() + 1;
    const dateStr = `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
    
    const statusText = {
        'present': 'присутствующими',
        'absent': 'отсутствующими', 
        'sick': 'болеющими'
    };
    
    if (!confirm(`Отметить всех детей как ${statusText[status]} на ${dateStr}?`)) {
        return;
    }
    
    isSaving = true;
    
    try {
        await markAttendanceBulk(currentGroupId, dateStr, status);
        
        // Обновляем локальные данные
        childrenList.forEach(child => {
            const key = `${child.id}-${day}`;
            attendanceData[key] = status;
        });
        
        renderTable();
        showNotification(`✅ Все отмечены как ${statusText[status]}`, 'success');
    } catch (error) {
        console.error('Ошибка массовой отметки:', error);
        handleApiError(error);
        showNotification('❌ Ошибка при массовой отметке', 'error');
    } finally {
        isSaving = false;
    }
}

// ===== ОБНОВЛЕНИЕ ИТОГОВ =====
function updateSummary(daysInMonth) {
    const dayTotals = {};
    for (let day = 1; day <= daysInMonth; day++) {
        dayTotals[day] = { present: 0, absent: 0, sick: 0, total: 0 };
        
        childrenList.forEach(child => {
            const key = `${child.id}-${day}`;
            const status = attendanceData[key];
            dayTotals[day].total++;
            
            if (status === 'present') dayTotals[day].present++;
            else if (status === 'absent') dayTotals[day].absent++;
            else if (status === 'sick') dayTotals[day].sick++;
        });
    }
    
    // Обновляем строку итогов в таблице
    const footerRow = document.querySelector('.summary-row');
    if (footerRow) {
        while (footerRow.children.length > 1) {
            footerRow.removeChild(footerRow.lastChild);
        }
        
        for (let day = 1; day <= daysInMonth; day++) {
            const td = document.createElement('td');
            const total = dayTotals[day].total;
            const present = dayTotals[day].present;
            const percent = total > 0 ? Math.round((present / total) * 100) : 0;
            
            td.textContent = `${present}/${total}`;
            td.style.fontWeight = '600';
            td.style.color = percent >= 80 ? '#48bb78' : percent >= 50 ? '#ed8936' : '#f56565';
            td.style.textAlign = 'center';
            td.title = `${percent}% посещаемости`;
            footerRow.appendChild(td);
        }
    }
    
    // Обновляем карточки статистики
    const today = new Date();
    const isCurrentMonth = today.getFullYear() === currentDate.getFullYear() && 
                          today.getMonth() === currentDate.getMonth();
    
    const todayDay = today.getDate();
    const todayStats = dayTotals[todayDay] || { present: 0, total: childrenList.length };
    
    const totalEl = document.getElementById('totalChildren');
    const presentEl = document.getElementById('presentToday');
    const absentEl = document.getElementById('absentToday');
    
    if (totalEl) totalEl.textContent = childrenList.length;
    if (presentEl) presentEl.textContent = isCurrentMonth ? todayStats.present : '—';
    if (absentEl) {
        const absent = todayStats.total - todayStats.present - (todayStats.sick || 0);
        absentEl.textContent = isCurrentMonth ? absent : '—';
    }
}

// ===== НАВИГАЦИЯ =====

// Изменение месяца
async function changeMonth(direction) {
    currentDate.setMonth(currentDate.getMonth() + direction);
    updateMonthDisplay();
    await loadAttendance();
}

// Изменение группы
async function changeGroup() {
    const select = document.getElementById('groupSelect');
    if (!select) return;
    
    const newGroupId = select.value;
    if (newGroupId == currentGroupId) return;
    
    currentGroupId = newGroupId;
    localStorage.setItem('currentGroup', currentGroupId);
    
    // Показываем индикатор загрузки
    showLoading(true);
    
    try {
        await loadChildren(new Set()); // Новый набор посещённых групп
    } finally {
        showLoading(false);
    }
}

// Обновление отображения месяца
function updateMonthDisplay() {
    const monthNames = [
        'Январь', 'Февраль', 'Март', 'Апрель', 'Май', 'Июнь',
        'Июль', 'Август', 'Сентябрь', 'Октябрь', 'Ноябрь', 'Декабрь'
    ];
    const monthName = monthNames[currentDate.getMonth()];
    const year = currentDate.getFullYear();
    
    const el = document.getElementById('monthDisplay');
    if (el) {
        el.textContent = `${monthName} ${year}`;
    }
}

// ===== ВКЛАДКИ =====

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
    const activeBtn = document.querySelector(`.tab-btn[onclick*="${tabName}"]`);
    if (activeBtn) activeBtn.classList.add('active');
    
    // Показываем нужную панель
    const panel = document.getElementById(tabName);
    if (panel) panel.classList.add('active');
    
    // Загружаем данные для вкладки
    if (tabName === 'statistics' && currentGroupId) {
        loadStatisticsTab();
    } else if (tabName === 'ai' && currentGroupId) {
        loadAIPredictions();
    }
}

// Загрузка статистики
async function loadStatisticsTab() {
    if (!currentGroupId) {
        document.getElementById('avgAttendance').textContent = '—';
        return;
    }
    
    try {
        const year = currentDate.getFullYear();
        const month = currentDate.getMonth() + 1;
        const stats = await getAttendanceStats(currentGroupId, year, month);
        
        document.getElementById('avgAttendance').textContent = 
            (stats.attendance_rate || 0).toFixed(1) + '%';
        
        // Находим лучший день
        let bestDay = '—';
        let maxPresent = 0;
        if (stats.by_day) {
            Object.entries(stats.by_day).forEach(([day, data]) => {
                if (data.present > maxPresent) {
                    maxPresent = data.present;
                    bestDay = `${day}.${String(month).padStart(2, '0')}`;
                }
            });
        }
        document.getElementById('bestDay').textContent = bestDay;
        document.getElementById('daysCount').textContent = 
            stats.by_day ? Object.keys(stats.by_day).length : 0;
        
        // Рисуем график
        renderBarChart(stats.by_day);
        
    } catch (error) {
        console.error('Ошибка загрузки статистики:', error);
        handleApiError(error);
    }
}

// Простой столбчатый график
function renderBarChart(byDay) {
    const container = document.getElementById('attendanceChart');
    if (!container) return;
    
    container.innerHTML = '';
    
    if (!byDay || Object.keys(byDay).length === 0) {
        container.innerHTML = '<p style="color: #718096; text-align: center;">📊 Нет данных для отображения</p>';
        return;
    }
    
    const maxPresent = Math.max(...Object.values(byDay).map(d => d.present || 0), 1);
    
    // Показываем первые 15 дней для компактности
    Object.entries(byDay).slice(0, 15).forEach(([day, data]) => {
        const height = (data.present / maxPresent) * 150;
        const percent = data.total > 0 ? Math.round((data.present / data.total) * 100) : 0;
        
        const barItem = document.createElement('div');
        barItem.className = 'bar-item';
        barItem.innerHTML = `
            <div class="bar" style="height: ${height}px;" 
                 title="${data.present} из ${data.total} (${percent}%)"></div>
            <span class="bar-label">${day}</span>
            <span class="bar-value">${data.present}/${data.total}</span>
        `;
        container.appendChild(barItem);
    });
}

// Загрузка AI прогнозов
async function loadAIPredictions() {
    if (!currentGroupId) return;
    
    try {
        const prediction = await getAIPrediction(currentGroupId);
        
        // Обновляем карточки
        updateAICard('aiDisease', prediction.disease_risk, prediction.disease_risk_description);
        updateAICard('aiAbsence', prediction.absence_risk, prediction.absence_risk_description);
        updateAICard('aiTransition', prediction.transition_risk, prediction.transition_risk_description);
        
        const accuracyEl = document.getElementById('aiAccuracy');
        if (accuracyEl) {
            accuracyEl.textContent = prediction.accuracy || '86';
        }
        
    } catch (error) {
        console.error('Ошибка загрузки AI:', error);
        handleApiError(error);
    }
}

function updateAICard(elementId, risk, description) {
    const el = document.getElementById(elementId);
    if (!el) return;
    
    const card = el.closest('.ai-card');
    if (!card) return;
    
    const level = (risk || 'medium').toLowerCase();
    card.className = `ai-card risk-${level}`;
    
    const levelText = {
        'low': 'Низкий',
        'medium': 'Средний', 
        'high': 'Высокий'
    };
    el.textContent = levelText[level] || '—';
    
    const descEl = card.querySelector('.ai-desc');
    if (descEl && description) {
        descEl.textContent = description;
    }
}

// ===== ОТЧЁТЫ =====

// Генерация отчёта
async function generateReport() {
    const reportType = document.getElementById('reportType')?.value || 'monthly';
    const reportMonth = document.getElementById('reportMonth')?.value || 
        `${currentDate.getFullYear()}-${String(currentDate.getMonth() + 1).padStart(2, '0')}`;
    
    if (!currentGroupId) {
        showNotification('⚠️ Выберите группу', 'warning');
        return;
    }
    
    const resultDiv = document.getElementById('reportResult');
    if (resultDiv) resultDiv.textContent = '⏳ Генерация...';
    
    try {
        await generateReportAPI(reportType, currentGroupId, reportMonth);
        
        if (resultDiv) {
            resultDiv.innerHTML = `
                ✅ Отчёт сгенерирован! 
                <button class="btn-small" onclick="exportToExcel()" style="margin-left: 10px;">📥 Скачать CSV</button>
            `;
        }
        showNotification('📄 Отчёт успешно сгенерирован', 'success');
        
    } catch (error) {
        console.error('Ошибка генерации:', error);
        handleApiError(error);
        if (resultDiv) resultDiv.textContent = '❌ Ошибка: ' + error.message;
    }
}

// Экспорт в Excel (CSV)
async function exportToExcel() {
    if (!currentGroupId) {
        showNotification('⚠️ Выберите группу', 'warning');
        return;
    }
    
    const reportMonth = document.getElementById('reportMonth')?.value || 
        `${currentDate.getFullYear()}-${String(currentDate.getMonth() + 1).padStart(2, '0')}`;
    
    try {
        await exportToExcelAPI(currentGroupId, reportMonth);
        showNotification('📥 Файл скачан!', 'success');
    } catch (error) {
        console.error('Ошибка экспорта:', error);
        handleApiError(error);
        showNotification('❌ Ошибка экспорта: ' + error.message, 'error');
    }
}

// ===== УТИЛИТЫ =====

// Обработка ошибок API
function handleApiError(error) {
    if (error.message === 'SESSION_EXPIRED') {
        showNotification('⏰ Сессия истекла. Пожалуйста, войдите снова', 'error');
        setTimeout(() => {
            clearToken();
            window.location.href = 'index.html';
        }, 1500);
        return;
    }
    
    if (error.message === 'ACCESS_DENIED') {
        showNotification('🔒 Недостаточно прав для этого действия', 'error');
        return;
    }
    
    if (error.message === 'SERVER_UNREACHABLE') {
        showNotification('🌐 Сервер недоступен. Проверьте подключение.', 'error');
        return;
    }
    
    // Для других ошибок показываем сообщение
    if (!error.handled) {
        showNotification(error.message || 'Произошла ошибка', 'error');
        error.handled = true;
    }
}

// Показ/скрытие индикатора загрузки
function showLoading(show) {
    const overlay = document.getElementById('loadingOverlay');
    if (overlay) {
        overlay.style.display = show ? 'flex' : 'none';
    }
}

// Уведомления
function showNotification(message, type = 'info') {
    // Удаляем старые уведомления
    document.querySelectorAll('.notification').forEach(n => n.remove());
    
    const notification = document.createElement('div');
    notification.className = `notification notification-${type}`;
    notification.style.cssText = `
        position: fixed; 
        top: 20px; 
        right: 20px; 
        padding: 15px 25px; 
        background: ${getTypeColor(type)}; 
        color: white; 
        border-radius: 12px; 
        box-shadow: 0 4px 20px rgba(0,0,0,0.15); 
        z-index: 9999; 
        font-weight: 500;
        animation: slideIn 0.3s ease;
        max-width: 350px;
    `;
    notification.textContent = message;
    document.body.appendChild(notification);
    
    // Авто-удаление
    setTimeout(() => {
        notification.style.animation = 'slideOut 0.3s ease';
        setTimeout(() => notification.remove(), 300);
    }, 4000);
}

function getTypeColor(type) {
    const colors = {
        'success': '#48bb78',
        'error': '#f56565',
        'warning': '#ed8936',
        'info': '#4299e1'
    };
    return colors[type] || colors.info;
}

// Добавляем стили для анимации уведомлений
const style = document.createElement('style');
style.textContent = `
    @keyframes slideIn { 
        from { transform: translateX(100%); opacity: 0; } 
        to { transform: translateX(0); opacity: 1; } 
    } 
    @keyframes slideOut { 
        from { transform: translateX(0); opacity: 1; } 
        to { transform: translateX(100%); opacity: 0; } 
    }
`;
document.head.appendChild(style);

// Настройка обработчиков событий
function setupEventListeners() {
    // Устанавливаем текущий месяц в инпут отчётов
    const monthInput = document.getElementById('reportMonth');
    if (monthInput) {
        const now = new Date();
        monthInput.value = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
    }
    
    // Закрытие уведомления по клику
    document.addEventListener('click', (e) => {
        if (e.target.classList.contains('notification')) {
            e.target.remove();
        }
    });
}

// Выход из системы
function logout() {
    showNotification('👋 До свидания!', 'info');
    
    // Пытаемся вызвать логаут на бэкенде (если есть эндпоинт)
    logoutUser().finally(() => {
        clearToken();
        setTimeout(() => {
            window.location.href = 'index.html';
        }, 1000);
    });
}

// Экспортируем функции для использования в HTML
window.logout = logout;
window.switchTab = switchTab;
window.generateReport = generateReport;
window.exportToExcel = exportToExcel;
window.changeMonth = changeMonth;
window.changeGroup = changeGroup;
window.markAllPresent = markAllPresent;
window.markAllAbsent = markAllAbsent;
window.markAllSick = markAllSick;

console.log('🌸 Teacher UI v2.0 loaded — API integrated, no mocks ☁️✨');