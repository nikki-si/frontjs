// Глобальные переменные
let usersList = [];
let groupsList = [];
let reportsList = [];
let auditLogs = [];

// Инициализация при загрузке страницы
document.addEventListener('DOMContentLoaded', async function() {
    console.log('Admin panel loaded');
    
    // Добавляем обработчики кликов на пункты меню
    const navItems = document.querySelectorAll('.nav-item[data-section]');
    navItems.forEach(item => {
        item.addEventListener('click', function(e) {
            e.preventDefault();
            const sectionName = this.getAttribute('data-section');
            showSection(sectionName);
        });
    });
    
    // Загружаем начальные данные
    await loadInitialData();
});

// Загрузка начальных данных
async function loadInitialData() {
    try {
        await Promise.all([
            loadUsers(),
            loadGroups(),
            loadAuditLogs()
        ]);
    } catch (error) {
        console.error('Ошибка загрузки данных:', error);
    }
}

// Загрузка пользователей
async function loadUsers() {
    try {
        usersList = [];
        
        // Получаем текущего пользователя
        const currentUser = await getCurrentUser();
        if (currentUser) {
            usersList.push({
                id: currentUser.id || 1,
                full_name: currentUser.full_name,
                role: currentUser.role,
                email: currentUser.email,
                is_active: currentUser.is_active
            });
        }
        
        renderUsersTable();
    } catch (error) {
        console.error('Ошибка загрузки пользователей:', error);
        usersList = [
            { id: 1, full_name: 'Администратор', role: 'admin', email: 'admin@sad.ru', is_active: true }
        ];
        renderUsersTable();
    }
}

// Загрузка групп
async function loadGroups() {
    try {
        groupsList = await getGroups();
    } catch (error) {
        console.error('Ошибка загрузки групп:', error);
    }
}

// Загрузка аудит логов
async function loadAuditLogs() {
    try {
        auditLogs = await getAuditLogs({ limit: 100 }); // ← передаём ОБЪЕКТ, а не null
        console.log('Аудит логи загружены:', auditLogs);
    } catch (error) {
        console.error('Ошибка загрузки логов:', error);
        auditLogs = [];
    }
}

// Отрисовка таблицы пользователей
function renderUsersTable() {
    const tbody = document.querySelector('#section-users .admin-table tbody');
    if (!tbody) return;
    
    tbody.innerHTML = '';
    
    usersList.forEach(user => {
        const row = document.createElement('tr');
        row.innerHTML = `
            <td>${user.full_name || '—'}</td>
            <td>${getRoleName(user.role)}</td>
            <td>${user.email || '—'}</td>
            <td>${user.group || '—'}</td>
            <td><span class="status ${user.is_active ? 'active' : ''}">${user.is_active ? 'Активен' : 'Неактивен'}</span></td>
            <td>
                <button class="btn-icon" onclick="editUser(${user.id})">✏️</button>
                <button class="btn-icon" onclick="deleteUser(${user.id})">🗑️</button>
            </td>
        `;
        tbody.appendChild(row);
    });
}

// Получение названия роли
function getRoleName(role) {
    const roles = {
        'admin': 'Администратор',
        'teacher': 'Воспитатель',
        'accountant': 'Бухгалтер'
    };
    return roles[role] || role;
}

// Показ секции
async function showSection(sectionName) {
    console.log('Showing section:', sectionName);
    
    // Скрываем все секции
    document.querySelectorAll('.admin-section').forEach(section => {
        section.classList.remove('active');
    });
    
    // Убираем активный класс со всех пунктов меню
    document.querySelectorAll('.nav-item').forEach(item => {
        item.classList.remove('active');
    });
    
    // Показываем нужную секцию
    const targetSection = document.getElementById('section-' + sectionName);
    if (targetSection) {
        targetSection.classList.add('active');
    }
    
    // Подсвечиваем активный пункт меню
    const activeNavItem = document.querySelector(`.nav-item[data-section="${sectionName}"]`);
    if (activeNavItem) {
        activeNavItem.classList.add('active');
    }
    
    // Загружаем данные для секции
    switch(sectionName) {
        case 'attendance':
            await loadAttendanceStats();
            break;
        case 'users':
            await loadUsers();
            break;
        case 'reports':
            await loadReports();
            break;
        case 'statistics':
            await loadStatistics();
            break;
    }
}

// Загрузка статистики посещаемости
async function loadAttendanceStats() {
    try {
        let totalRate = 0;
        let count = 0;
        
        for (const group of groupsList) {
            const stats = await getAttendanceStats(
                group.id, 
                new Date().getFullYear(), 
                new Date().getMonth() + 1
            );
            totalRate += stats.attendance_rate || 0;
            count++;
        }
        
        const avgRate = count > 0 ? (totalRate / count).toFixed(1) : 0;
        document.querySelector('#section-attendance .big-value').textContent = avgRate + '%';
        
    } catch (error) {
        console.error('Ошибка загрузки статистики:', error);
    }
}

// Загрузка отчётов
async function loadReports() {
    try {
        // В бэкенде нет /reports/list, используем платёжные отчёты
        reportsList = [];
        
        // Получаем отчёты по всем группам за текущий месяц
        const today = new Date();
        const currentMonth = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-01`;
        
        for (const group of groupsList) {
            try {
                const report = await getGroupPaymentReport(group.id, currentMonth);
                reportsList.push({
                    id: `payment-${group.id}-${currentMonth}`,
                    name: `Платёжный отчёт - ${group.name} - ${today.toLocaleString('ru', { month: 'long', year: 'numeric' })}`,
                    created_at: new Date().toISOString().split('T')[0],
                    author: 'Система',
                    type: 'payment',
                    group_id: group.id,
                    month: currentMonth
                });
            } catch (error) {
                console.error(`Ошибка загрузки отчёта для группы ${group.id}:`, error);
            }
        }
        
        // Добавляем демо-отчёты для теста
        reportsList.push(
            { 
                id: 'demo-1', 
                name: 'Ежемесячный отчёт - Март 2026', 
                created_at: '2026-03-19', 
                author: 'Петрова А.С.',
                type: 'monthly'
            },
            { 
                id: 'demo-2', 
                name: 'Финансовый отчёт - Q1 2026', 
                created_at: '2026-03-01', 
                author: 'Петрова А.С.',
                type: 'financial'
            }
        );
        
        renderReportsList();
        console.log('✅ Отчёты загружены:', reportsList.length);
    } catch (error) {
        console.error('Ошибка загрузки отчётов:', error);
        // Заглушка
        reportsList = [
            { id: 1, name: 'Ежемесячный отчёт - Март 2026', created_at: '2026-03-19', author: 'Система' },
            { id: 2, name: 'Финансовый отчёт - Q1 2026', created_at: '2026-03-01', author: 'Система' }
        ];
        renderReportsList();
    }
}

// Отрисовка списка отчётов
function renderReportsList() {
    const container = document.querySelector('.reports-list');
    if (!container) return;
    
    container.innerHTML = '';
    
    if (reportsList.length === 0) {
        container.innerHTML = '<div class="report-item" style="justify-content: center; color: #718096;">Нет доступных отчётов</div>';
        return;
    }
    
    reportsList.forEach(report => {
        const item = document.createElement('div');
        item.className = 'report-item';
        item.innerHTML = `
            <div class="report-info">
                <strong>${report.name}</strong>
                <span>Создан: ${report.created_at} | Автор: ${report.author || 'Система'}</span>
            </div>
            <div class="report-actions">
                <button class="btn-small" onclick="downloadReport('${report.id}')">📥 Скачать</button>
                ${report.type !== 'payment' ? `<button class="btn-delete" onclick="deleteReport(this, '${report.id}')">🗑️ Удалить</button>` : ''}
            </div>
        `;
        container.appendChild(item);
    });
}
// Загрузка общей статистики
async function loadStatistics() {
    try {
        const stats = {
            active: 0,
            newThisMonth: 0,
            errors: 0
        };
        
        // Считаем активных пользователей
        stats.active = usersList.filter(u => u.is_active).length;
        
        // Считаем новых за месяц
        const now = new Date();
        const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
        stats.newThisMonth = usersList.filter(u => {
            const created = new Date(u.created_at);
            return created >= monthStart;
        }).length;
        
        // Обновляем отображение
        const statBoxes = document.querySelectorAll('#section-statistics .stat-box .stat-number');
        if (statBoxes[0]) statBoxes[0].textContent = stats.active;
        if (statBoxes[1]) statBoxes[1].textContent = stats.newThisMonth;
        if (statBoxes[3]) statBoxes[3].textContent = stats.errors;
        
    } catch (error) {
        console.error('Ошибка загрузки статистики:', error);
    }
}

// Добавление пользователя
async function addUser() {
    const name = prompt('Введите ФИО пользователя:');
    if (!name) return;
    
    const email = prompt('Введите email:');
    if (!email) return;
    
    const role = prompt('Введите роль (admin/teacher/accountant):');
    if (!role) return;
    
    const password = prompt('Введите пароль (минимум 6 символов):');
    if (!password || password.length < 6) {
        alert('Пароль должен быть не менее 6 символов');
        return;
    }
    
    try {
        await registerUser(email, password, name, role);
        alert('Пользователь успешно добавлен!');
        await loadUsers();
    } catch (error) {
        console.error('Ошибка добавления пользователя:', error);
        alert('Ошибка при добавлении пользователя: ' + error.message);
    }
}

// Редактирование пользователя
async function editUser(userId) {
    const user = usersList.find(u => u.id === userId);
    if (!user) return;
    
    const newName = prompt('Введите новое ФИО:', user.full_name);
    if (!newName) return;
    
    const newRole = prompt('Введите новую роль (admin/teacher/accountant):', user.role);
    if (!newRole) return;
    
    try {
        await apiRequest(`/users/${userId}`, {
            method: 'PUT',
            body: JSON.stringify({
                full_name: newName,
                role: newRole
            })
        });
        alert('Пользователь обновлён!');
        await loadUsers();
    } catch (error) {
        console.error('Ошибка обновления пользователя:', error);
        alert('Ошибка при обновлении: ' + error.message);
    }
}

// Удаление пользователя
async function deleteUser(userId) {
    if (!confirm('Вы уверены, что хотите удалить пользователя?')) return;
    
    try {
        await apiRequest(`/users/${userId}`, {
            method: 'DELETE'
        });
        alert('Пользователь удалён!');
        await loadUsers();
    } catch (error) {
        console.error('Ошибка удаления пользователя:', error);
        alert('Ошибка при удалении: ' + error.message);
    }
}

// Создание отчёта
async function createReport() {
    const reportType = prompt('Тип отчёта (monthly/attendance/financial):', 'monthly');
    if (!reportType) return;
    
    const reportPeriod = prompt('Период (например, 2026-03):', '2026-03');
    if (!reportPeriod) return;
    
    try {
        for (const group of groupsList) {
            await generateReport(reportType, group.id, reportPeriod);
        }
        alert('Отчёты созданы!');
        await loadReports();
    } catch (error) {
        console.error('Ошибка создания отчёта:', error);
        alert('Ошибка: ' + error.message);
    }
}

// Скачивание отчёта
async function downloadReport(reportId) {
    try {
        const report = reportsList.find(r => r.id == reportId);
        if (!report) {
            alert('Отчёт не найден');
            return;
        }
        
        if (report.type === 'payment' && report.group_id) {
            // Для платёжного отчёта - экспортируем в CSV
            const paymentReport = await getGroupPaymentReport(report.group_id, report.month);
            
            let csv = 'Ребёнок,Сумма,Оплачено,Баланс,Статус\n';
            paymentReport.payments.forEach(p => {
                csv += `"${p.child_name}",${p.amount},${p.paid_amount},${p.balance},"${p.status}"\n`;
            });
            
            const blob = new Blob(['\ufeff' + csv], { type: 'text/csv;charset=utf-8;' });
            const url = window.URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = `payment_report_${report.group_id}_${report.month}.csv`;
            a.click();
            window.URL.revokeObjectURL(url);
        } else {
            // Для других отчётов
            alert(`Скачивание отчёта: ${report.name}\n(Демо-режим)`);
        }
    } catch (error) {
        console.error('Ошибка скачивания:', error);
        alert('Ошибка при скачивании отчёта: ' + error.message);
    }
}

// Удаление отчёта
async function deleteReport(button, reportId) {
    if (!confirm('Вы уверены, что хотите удалить этот отчёт?\n\nЭто действие нельзя отменить.')) {
        return;
    }
    
    const reportItem = button.closest('.report-item');
    
    try {
        await apiRequest(`/reports/${reportId}`, {
            method: 'DELETE'
        });
        
        reportItem.style.opacity = '0';
        reportItem.style.transform = 'translateX(-20px)';
        setTimeout(() => {
            reportItem.remove();
        }, 300);
        
    } catch (error) {
        console.error('Ошибка удаления отчёта:', error);
        alert('Ошибка при удалении отчёта');
    }
}

// Сохранение настроек
async function saveSettings() {
    const settings = {
        notifications: document.querySelector('#section-settings .switch:first-child input')?.checked,
        autosave: document.querySelector('#section-settings .switch:nth-child(2) input')?.checked,
        language: document.querySelector('#section-settings select')?.value,
        maintenance: document.querySelector('#section-settings .switch:last-child input')?.checked
    };
    
    try {
        await apiRequest('/settings', {
            method: 'POST',
            body: JSON.stringify(settings)
        });
        alert('Настройки сохранены!');
    } catch (error) {
        console.error('Ошибка сохранения настроек:', error);
        alert('Ошибка при сохранении настроек');
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