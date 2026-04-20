// Глобальные переменные
let currentDate = new Date();
let currentGroupId = localStorage.getItem('currentGroup') || '1';
let childrenList = [];
let attendanceData = {};
let groupsList = [];

// Инициализация
document.addEventListener('DOMContentLoaded', async function() {
    loadTeacherInfo();
    await loadGroups();
    await loadChildren();
    updateMonthDisplay();
});

// Загрузка информации воспитателя
function loadTeacherInfo() {
    const userName = localStorage.getItem('userName') || 'Воспитатель';
    document.getElementById('teacherName').textContent = userName;
}

// Загрузка списка групп
async function loadGroups() {
    try {
        groupsList = await getGroups();
        const select = document.getElementById('groupSelect');
        select.innerHTML = '';
        
        groupsList.forEach(group => {
            const option = document.createElement('option');
            option.value = group.id;
            option.textContent = group.name;
            if (group.id == currentGroupId) {
                option.selected = true;
            }
            select.appendChild(option);
        });
    } catch (error) {
        console.error('Ошибка загрузки групп:', error);
        showNotification('Ошибка загрузки групп', 'error');
    }
}

// Загрузка детей выбранной группы
async function loadChildren() {
    try {
        childrenList = await getChildrenByGroup(currentGroupId);
        await loadAttendance();
    } catch (error) {
        console.error('Ошибка загрузки детей:', error);
        showNotification('Ошибка загрузки списка детей', 'error');
    }
}

// Загрузка посещаемости за текущий месяц
async function loadAttendance() {
    const year = currentDate.getFullYear();
    const month = currentDate.getMonth() + 1;
    
    try {
        const data = await getAttendance(currentGroupId, year, month);
        
        // Преобразуем в удобный формат
        attendanceData = {};
        data.forEach(record => {
            const day = new Date(record.date).getDate();
            const key = `${record.child_id}-${day}`;
            attendanceData[key] = record.status;
        });
        
        renderTable();
    } catch (error) {
        console.error('Ошибка загрузки посещаемости:', error);
        showNotification('Ошибка загрузки данных посещаемости', 'error');
        renderTable(); // Рендерим с пустыми данными
    }
}

// Отрисовка таблицы
function renderTable() {
    const tableBody = document.getElementById('tableBody');
    const tableHead = document.querySelector('.attendance-table thead tr');
    
    tableBody.innerHTML = '';
    
    // Очищаем заголовки дат
    while (tableHead.children.length > 1) {
        tableHead.removeChild(tableHead.lastChild);
    }
    
    const daysInMonth = new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 0).getDate();
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
        }
        
        tableHead.appendChild(th);
    }
    
    // Добавляем строки с детьми
    childrenList.forEach(child => {
        const row = document.createElement('tr');
        
        // ФИО ребенка
        const nameCell = document.createElement('td');
        nameCell.textContent = child.full_name || 'Без имени';
        nameCell.className = 'name-col';
        row.appendChild(nameCell);
        
        // Ячейки с датами
        for (let day = 1; day <= daysInMonth; day++) {
            const cell = document.createElement('td');
            const key = `${child.id}-${day}`;
            const status = attendanceData[key] || 'absent';
            
            const btn = document.createElement('button');
            btn.className = 'attendance-btn';
            btn.classList.add(status === 'present' ? 'present' : 'absent');
            btn.textContent = status === 'present' ? '✓' : '✗';
            btn.onclick = () => toggleAttendance(child.id, day, btn);
            
            cell.appendChild(btn);
            row.appendChild(cell);
        }
        
        tableBody.appendChild(row);
    });
    
    updateSummary(daysInMonth);
}

// Переключение посещаемости
async function toggleAttendance(childId, day, btn) {
    const year = currentDate.getFullYear();
    const month = currentDate.getMonth() + 1;
    const dateStr = `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
    
    const newStatus = btn.classList.contains('present') ? 'absent' : 'present';
    
    // Оптимистичное обновление UI
    btn.classList.remove('present', 'absent');
    btn.classList.add(newStatus);
    btn.textContent = newStatus === 'present' ? '✓' : '✗';
    
    const key = `${childId}-${day}`;
    attendanceData[key] = newStatus;
    
    try {
        await markAttendance(childId, dateStr, newStatus);
        updateSummary(new Date(year, month, 0).getDate());
    } catch (error) {
        console.error('Ошибка сохранения:', error);
        showNotification('Ошибка сохранения', 'error');
        
        // Откат изменений
        const oldStatus = newStatus === 'present' ? 'absent' : 'present';
        btn.classList.remove('present', 'absent');
        btn.classList.add(oldStatus);
        btn.textContent = oldStatus === 'present' ? '✓' : '✗';
        attendanceData[key] = oldStatus;
    }
}

// Массовая отметка присутствия (сегодня)
async function markAllPresent() {
    await markAllWithStatus('present', '✓', '✅');
}

// Массовая отметка отсутствия (сегодня)
async function markAllAbsent() {
    await markAllWithStatus('absent', '✗', '❌');
}

async function markAllWithStatus(status, symbol, emoji) {
    const today = new Date();
    const isCurrentMonth = today.getFullYear() === currentDate.getFullYear() && 
                          today.getMonth() === currentDate.getMonth();
    
    if (!isCurrentMonth) {
        showNotification('Можно отмечать только текущий месяц', 'warning');
        return;
    }
    
    const day = today.getDate();
    const year = currentDate.getFullYear();
    const month = currentDate.getMonth() + 1;
    const dateStr = `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
    
    if (!confirm(`Отметить всех ${emoji} на ${dateStr}?`)) {
        return;
    }
    
    try {
        await markAttendanceBulk(currentGroupId, dateStr, status);
        
        // Обновляем локальные данные
        childrenList.forEach(child => {
            const key = `${child.id}-${day}`;
            attendanceData[key] = status;
        });
        
        renderTable();
        showNotification(`Все отмечены как ${status === 'present' ? 'присутствующие' : 'отсутствующие'}`, 'success');
    } catch (error) {
        console.error('Ошибка массовой отметки:', error);
        showNotification('Ошибка при массовой отметке', 'error');
    }
}

// Обновление итогов
function updateSummary(daysInMonth) {
    const dayTotals = {};
    
    for (let day = 1; day <= daysInMonth; day++) {
        dayTotals[day] = { present: 0, absent: 0 };
        
        childrenList.forEach(child => {
            const key = `${child.id}-${day}`;
            if (attendanceData[key] === 'present') {
                dayTotals[day].present++;
            } else {
                dayTotals[day].absent++;
            }
        });
    }
    
    // Обновляем строку итогов
    const footerRow = document.querySelector('.summary-row');
    while (footerRow.children.length > 1) {
        footerRow.removeChild(footerRow.lastChild);
    }
    
    for (let day = 1; day <= daysInMonth; day++) {
        const td = document.createElement('td');
        td.textContent = dayTotals[day].present;
        td.style.fontWeight = '600';
        td.style.color = '#48bb78';
        td.style.textAlign = 'center';
        footerRow.appendChild(td);
    }
    
    const today = new Date();
    const isCurrentMonth = today.getFullYear() === currentDate.getFullYear() && 
                          today.getMonth() === currentDate.getMonth();
    
    const todayDay = today.getDate();
    const presentToday = isCurrentMonth ? (dayTotals[todayDay]?.present || 0) : 0;
    const total = childrenList.length;
    
    document.getElementById('totalChildren').textContent = total;
    document.getElementById('presentToday').textContent = presentToday;
    document.getElementById('absentToday').textContent = total - presentToday;
}

// Изменение месяца
async function changeMonth(direction) {
    currentDate.setMonth(currentDate.getMonth() + direction);
    updateMonthDisplay();
    await loadAttendance();
}

// Изменение группы
async function changeGroup() {
    currentGroupId = document.getElementById('groupSelect').value;
    localStorage.setItem('currentGroup', currentGroupId);
    await loadChildren();
}

// Обновление отображения месяца
function updateMonthDisplay() {
    const monthNames = [
        'Январь', 'Февраль', 'Март', 'Апрель', 'Май', 'Июнь',
        'Июль', 'Август', 'Сентябрь', 'Октябрь', 'Ноябрь', 'Декабрь'
    ];
    
    const monthName = monthNames[currentDate.getMonth()];
    const year = currentDate.getFullYear();
    
    document.getElementById('monthDisplay').textContent = `${monthName} ${year}`;
}

// Уведомления
function showNotification(message, type = 'info') {
    const notification = document.createElement('div');
    notification.style.cssText = `
        position: fixed;
        top: 20px;
        right: 20px;
        padding: 15px 25px;
        background: ${type === 'success' ? '#48bb78' : type === 'error' ? '#f56565' : '#4299e1'};
        color: white;
        border-radius: 10px;
        box-shadow: 0 4px 15px rgba(0,0,0,0.2);
        z-index: 9999;
        animation: slideIn 0.3s ease;
    `;
    notification.textContent = message;
    document.body.appendChild(notification);
    
    setTimeout(() => {
        notification.style.animation = 'slideOut 0.3s ease';
        setTimeout(() => notification.remove(), 300);
    }, 3000);
}

// Добавим стили для анимации
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

// Выход
function logout() {
    clearToken();
    localStorage.removeItem('isLoggedIn');
    localStorage.removeItem('userRole');
    localStorage.removeItem('userName');
    window.location.href = 'index.html';
}