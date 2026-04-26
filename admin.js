// Глобальные переменные
let usersList = [];
let groupsList = [];
let reportsList = [];
let auditLogs = [];

// Инициализация
document.addEventListener('DOMContentLoaded', async function() {
    console.log('Admin panel loaded');
    
    const navItems = document.querySelectorAll('.nav-item[data-section]');
    navItems.forEach(item => {
        item.addEventListener('click', function(e) {
            e.preventDefault();
            const sectionName = this.getAttribute('data-section');
            showSection(sectionName);
        });
    });
    
    await loadInitialData();
    await loadAttendanceStats();
});

async function loadInitialData() {
    try {
        await Promise.all([
            loadUsers(),
            loadGroups(),
            loadPendingUsers(),
            loadAuditLogs()
        ]);
        console.log('✅ Все данные загружены');
    } catch (error) {
        console.error('Ошибка загрузки данных:', error);
    }
}

async function loadUsers() {
    try {
        const token = localStorage.getItem('jwt_token');
        const response = await fetch('http://localhost:8000/users/', {
            headers: { 'Authorization': `Bearer ${token}` }
        });
        
        if (response.ok) {
            usersList = await response.json();
        } else {
            usersList = [];
        }
        renderUsersTable();
    } catch (error) {
        console.error('Ошибка загрузки пользователей:', error);
        usersList = [];
        renderUsersTable();
    }
}

async function loadGroups() {
    try {
        groupsList = await getGroups();
        console.log('Группы загружены:', groupsList.length);
        
        // Обновляем select для группы в форме добавления пользователя
        const groupSelect = document.getElementById('newUserGroup');
        if (groupSelect && groupsList.length > 0) {
            groupSelect.innerHTML = '<option value="">-- Без группы --</option>' + 
                groupsList.map(g => `<option value="${g.id}">${g.name}</option>`).join('');
        }
    } catch (error) {
        console.error('Ошибка загрузки групп:', error);
        groupsList = [];
    }
}

async function loadAuditLogs() {
    try {
        auditLogs = await getAuditLogs({ limit: 100 });
        console.log('Аудит логи загружены:', auditLogs.length);
    } catch (error) {
        console.error('Ошибка загрузки логов:', error);
        auditLogs = [];
    }
}

function renderUsersTable() {
    const tbody = document.querySelector('#section-users .admin-table tbody');
    if (!tbody) return;
    
    tbody.innerHTML = '';
    
    if (usersList.length === 0) {
        tbody.innerHTML = '<tr><td colspan="6" style="text-align: center;">Нет пользователей</td></tr>';
        return;
    }
    
    usersList.forEach(user => {
        if (user.role === 'PENDING') return;
        
        const row = document.createElement('tr');
        row.innerHTML = `
            <td>${user.full_name || '—'}</td>
            <td>${getRoleName(user.role)}</td>
            <td>${user.email || '—'}</td>
            <td>
                ${user.role === 'TEACHER' ? 
                    `<select id="group-select-${user.id}" class="group-select-small">
                        <option value="">-- Выберите группу --</option>
                        ${groupsList.map(g => `<option value="${g.id}" ${g.teacher_id === user.id ? 'selected' : ''}>${g.name}</option>`).join('')}
                    </select>
                    <button class="btn-icon" onclick="assignGroup(${user.id})">📎</button>` 
                    : (user.group_id || '—')}
            </td>
            <td><span class="status ${user.is_active ? 'active' : ''}">${user.is_active ? 'Активен' : 'Неактивен'}</span></td>
            <td>
                <button class="btn-icon" onclick="editUser(${user.id})">✏️</button>
                <button class="btn-icon" onclick="deleteUser(${user.id})">🗑️</button>
            </td>
        `;
        tbody.appendChild(row);
    });
}

// Назначить группу учителю
async function assignGroup(userId) {
    const select = document.getElementById(`group-select-${userId}`);
    const groupId = select.value;
    
    if (!groupId) {
        alert('Выберите группу для назначения!');
        return;
    }
    
    const token = localStorage.getItem('jwt_token');
    
    try {
        const response = await fetch(`http://localhost:8000/users/${userId}/assign-group?group_id=${groupId}`, {
            method: 'PUT',
            headers: { 'Authorization': `Bearer ${token}` }
        });
        
        if (response.ok) {
            alert('✅ Группа назначена учителю!');
            await loadUsers(); // Обновить таблицу
            await loadGroups(); // Обновить список групп
        } else {
            const error = await response.json();
            alert('Ошибка: ' + error.detail);
        }
    } catch (error) {
        console.error('Ошибка:', error);
        alert('Ошибка при назначении группы');
    }
}

// Экспортируем функцию для HTML
window.assignGroup = assignGroup;

function getRoleName(role) {
    const roles = {
        'ADMIN': 'Администратор',
        'TEACHER': 'Воспитатель',
        'ACCOUNTANT': 'Бухгалтер',
        'PENDING': 'Ожидает подтверждения'
    };
    return roles[role] || role;
}

async function showSection(sectionName) {
    console.log('Showing section:', sectionName);
    
    document.querySelectorAll('.admin-section').forEach(section => {
        section.classList.remove('active');
    });
    
    document.querySelectorAll('.nav-item').forEach(item => {
        item.classList.remove('active');
    });
    
    const targetSection = document.getElementById('section-' + sectionName);
    if (targetSection) {
        targetSection.classList.add('active');
    }
    
    const activeNavItem = document.querySelector(`.nav-item[data-section="${sectionName}"]`);
    if (activeNavItem) {
        activeNavItem.classList.add('active');
    }
    
    switch(sectionName) {
        case 'attendance':
            await loadAttendanceStats();
            break;
        case 'users':
            await loadUsers();
            break;
        case 'pending':
            await loadPendingUsers();
            break;
        case 'reports':
            await loadReports();
            break;
        case 'statistics':
            await loadStatistics();
            break;
    }
}

async function loadAttendanceStats() {
    try {
        if (!groupsList || groupsList.length === 0) {
            await loadGroups();
        }
        
        if (groupsList.length === 0) {
            const attendanceElement = document.querySelector('#section-attendance .big-value');
            if (attendanceElement) attendanceElement.textContent = '0%';
            return;
        }
        
        const year = new Date().getFullYear();
        const month = new Date().getMonth() + 1;
        
        let totalGroups = 0;
        let sumOfRates = 0;
        
        for (const group of groupsList) {
            try {
                const stats = await getAttendanceStats(group.id, year, month);
                if (stats.attendance_rate > 0) {
                    totalGroups++;
                    sumOfRates += stats.attendance_rate;
                }
            } catch (error) {
                console.error(`Ошибка статистики для группы ${group.id}:`, error);
            }
        }
        
        const avgRate = totalGroups > 0 ? (sumOfRates / totalGroups).toFixed(1) : 0;
        
        const attendanceElement = document.querySelector('#section-attendance .big-value');
        if (attendanceElement) {
            attendanceElement.textContent = avgRate + '%';
        }
        
    } catch (error) {
        console.error('Ошибка загрузки статистики:', error);
    }
}

// ===== ЗАЯВКИ =====

async function loadPendingUsers() {
    try {
        const token = localStorage.getItem('jwt_token');
        const response = await fetch('http://localhost:8000/users/pending', {
            headers: { 'Authorization': `Bearer ${token}` }
        });
        
        if (response.ok) {
            const pendingUsers = await response.json();
            renderPendingUsers(pendingUsers);
            
            const badge = document.getElementById('pendingCount');
            if (badge) {
                if (pendingUsers.length > 0) {
                    badge.textContent = pendingUsers.length;
                    badge.style.display = 'inline-block';
                } else {
                    badge.style.display = 'none';
                }
            }
        }
    } catch (error) {
        console.error('Ошибка загрузки заявок:', error);
    }
}

function renderPendingUsers(users) {
    const tbody = document.getElementById('pendingUsersTable');
    if (!tbody) return;
    
    if (users.length === 0) {
        tbody.innerHTML = '<tr><td colspan="6" style="text-align: center;">✅ Нет новых заявок</td></tr>';
        return;
    }
    
    tbody.innerHTML = '';
    
    users.forEach(user => {
        const row = document.createElement('tr');
        row.innerHTML = `
            <td>${user.full_name}</td>
            <td>${user.email}</td>
            <td>${getRoleName(user.role)}</td>
            <td>${new Date(user.created_at).toLocaleDateString()}</td>
            <td>
                <select id="group-${user.id}" class="group-select" style="${user.role === 'TEACHER' ? 'display: inline-block;' : 'display: none;'}">
                    <option value="">-- Выберите группу --</option>
                    ${groupsList.map(g => `<option value="${g.id}">${g.name}</option>`).join('')}
                </select>
                ${user.role !== 'TEACHER' ? '<span style="color: #718096;">—</span>' : ''}
               </td>
            <td>
                <button class="btn-small" onclick="approveUser(${user.id}, '${user.role}')">✅ Подтвердить</button>
                <button class="btn-delete" onclick="rejectUser(${user.id})">❌ Отклонить</button>
               </td>
        `;
        tbody.appendChild(row);
    });
}

async function approveUser(userId, role) {
    let groupId = null;
    
    if (role === 'TEACHER') {
        const select = document.getElementById(`group-${userId}`);
        groupId = select.value;
        if (!groupId) {
            alert('Для воспитателя необходимо выбрать группу!');
            return;
        }
    }
    
    const token = localStorage.getItem('jwt_token');
    const url = `http://localhost:8000/users/${userId}/approve` + (groupId ? `?group_id=${groupId}` : '');
    
    try {
        const response = await fetch(url, {
            method: 'PUT',
            headers: { 'Authorization': `Bearer ${token}` }
        });
        
        if (response.ok) {
            alert('✅ Пользователь активирован!');
            await loadPendingUsers();
            await loadUsers();
            await loadGroups();
        } else {
            const error = await response.json();
            alert('Ошибка: ' + error.detail);
        }
    } catch (error) {
        console.error('Ошибка:', error);
        alert('Ошибка при подтверждении');
    }
}

async function rejectUser(userId) {
    if (!confirm('Вы уверены, что хотите отклонить заявку?')) return;
    
    const token = localStorage.getItem('jwt_token');
    
    try {
        const response = await fetch(`http://localhost:8000/users/${userId}/reject`, {
            method: 'DELETE',
            headers: { 'Authorization': `Bearer ${token}` }
        });
        
        if (response.ok) {
            alert('❌ Заявка отклонена');
            await loadPendingUsers();
        } else {
            const error = await response.json();
            alert('Ошибка: ' + error.detail);
        }
    } catch (error) {
        console.error('Ошибка:', error);
        alert('Ошибка при отклонении');
    }
}

// ===== ОТЧЁТЫ =====

async function loadReports() {
    try {
        reportsList = [];
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
        
        renderReportsList();
    } catch (error) {
        console.error('Ошибка загрузки отчётов:', error);
        reportsList = [];
        renderReportsList();
    }
}

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
                <button class="btn-delete" onclick="deleteReport(this, '${report.id}')">🗑️ Удалить</button>
            </div>
        `;
        container.appendChild(item);
    });
}

async function downloadReport(reportId) {
    try {
        const report = reportsList.find(r => r.id == reportId);
        if (!report) {
            alert('Отчёт не найден');
            return;
        }
        
        if (report.type === 'payment' && report.group_id) {
            const paymentReport = await getGroupPaymentReport(report.group_id, report.month);
            
            let csv = 'Ребёнок,Сумма,Оплачено,Баланс,Статус\n';
            if (paymentReport.payments) {
                paymentReport.payments.forEach(p => {
                    csv += `"${p.child_name}",${p.amount},${p.paid_amount},${p.balance},"${p.status}"\n`;
                });
            }
            
            const blob = new Blob(['\ufeff' + csv], { type: 'text/csv;charset=utf-8;' });
            const url = window.URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = `payment_report_${report.group_id}_${report.month}.csv`;
            a.click();
            window.URL.revokeObjectURL(url);
        } else {
            alert(`Скачивание отчёта: ${report.name}\n(Демо-режим)`);
        }
    } catch (error) {
        console.error('Ошибка скачивания:', error);
        alert('Ошибка при скачивании отчёта: ' + error.message);
    }
}

async function deleteReport(button, reportId) {
    if (!confirm('Вы уверены, что хотите удалить этот отчёт?')) return;
    
    const reportItem = button.closest('.report-item');
    
    try {
        const token = localStorage.getItem('jwt_token');
        await fetch(`http://localhost:8000/reports/${reportId}`, {
            method: 'DELETE',
            headers: { 'Authorization': `Bearer ${token}` }
        });
        
        reportItem.style.opacity = '0';
        reportItem.style.transform = 'translateX(-20px)';
        setTimeout(() => reportItem.remove(), 300);
    } catch (error) {
        console.error('Ошибка удаления отчёта:', error);
        alert('Ошибка при удалении отчёта');
    }
}

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

// ===== СТАТИСТИКА =====

async function loadStatistics() {
    try {
        const stats = {
            active: usersList.filter(u => u.is_active).length,
            newThisMonth: 0,
            errors: 0
        };
        
        const now = new Date();
        const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
        stats.newThisMonth = usersList.filter(u => {
            const created = new Date(u.created_at);
            return created >= monthStart;
        }).length;
        
        const statBoxes = document.querySelectorAll('#section-statistics .stat-box .stat-number');
        if (statBoxes[0]) statBoxes[0].textContent = stats.active;
        if (statBoxes[1]) statBoxes[1].textContent = stats.newThisMonth;
        if (statBoxes[3]) statBoxes[3].textContent = stats.errors;
        
    } catch (error) {
        console.error('Ошибка загрузки статистики:', error);
    }
}

// ===== УПРАВЛЕНИЕ ПОЛЬЗОВАТЕЛЯМИ =====

async function addUser() {
    const name = prompt('Введите ФИО пользователя:');
    if (!name) return;
    
    const email = prompt('Введите email:');
    if (!email) return;
    
    const role = prompt('Введите роль (ADMIN/TEACHER/ACCOUNTANT):');
    if (!role) return;
    
    const password = prompt('Введите пароль (минимум 6 символов):');
    if (!password || password.length < 6) {
        alert('Пароль должен быть не менее 6 символов');
        return;
    }
    
    try {
        await registerUser(email, password, name, role);
        alert('✅ Пользователь успешно добавлен!');
        await loadUsers();
    } catch (error) {
        console.error('Ошибка добавления пользователя:', error);
        alert('Ошибка при добавлении пользователя: ' + error.message);
    }
}

async function editUser(userId) {
    const user = usersList.find(u => u.id === userId);
    if (!user) return;
    
    const newName = prompt('Введите новое ФИО:', user.full_name);
    if (!newName) return;
    
    const newRole = prompt('Введите новую роль (ADMIN/TEACHER/ACCOUNTANT):', user.role);
    if (!newRole) return;
    
    try {
        const token = localStorage.getItem('jwt_token');
        const response = await fetch(`http://localhost:8000/users/${userId}`, {
            method: 'PUT',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
            },
            body: JSON.stringify({ full_name: newName, role: newRole })
        });
        
        if (response.ok) {
            alert('✅ Пользователь обновлён!');
            await loadUsers();
        } else {
            const error = await response.json();
            alert('Ошибка: ' + error.detail);
        }
    } catch (error) {
        console.error('Ошибка обновления пользователя:', error);
        alert('Ошибка при обновлении: ' + error.message);
    }
}

async function deleteUser(userId) {
    if (!confirm('Вы уверены, что хотите удалить пользователя?')) return;
    
    try {
        const token = localStorage.getItem('jwt_token');
        const response = await fetch(`http://localhost:8000/users/${userId}`, {
            method: 'DELETE',
            headers: { 'Authorization': `Bearer ${token}` }
        });
        
        if (response.ok) {
            alert('✅ Пользователь удалён!');
            await loadUsers();
        } else {
            const error = await response.json();
            alert('Ошибка: ' + error.detail);
        }
    } catch (error) {
        console.error('Ошибка удаления пользователя:', error);
        alert('Ошибка при удалении: ' + error.message);
    }
}

// ===== НАСТРОЙКИ =====

async function saveSettings() {
    const settings = {
        notifications: document.querySelector('#section-settings .switch:first-child input')?.checked,
        autosave: document.querySelector('#section-settings .switch:nth-child(2) input')?.checked,
        language: document.querySelector('#section-settings select')?.value,
        maintenance: document.querySelector('#section-settings .switch:last-child input')?.checked
    };
    
    try {
        const token = localStorage.getItem('jwt_token');
        await fetch('http://localhost:8000/settings', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
            },
            body: JSON.stringify(settings)
        });
        alert('✅ Настройки сохранены!');
    } catch (error) {
        console.error('Ошибка сохранения настроек:', error);
        alert('Ошибка при сохранении настроек');
    }
}

// ===== ВЫХОД =====

function logout() {
    clearToken();
    localStorage.removeItem('isLoggedIn');
    localStorage.removeItem('userRole');
    localStorage.removeItem('userName');
    window.location.href = 'index.html';
}

// ===== ЭКСПОРТ ФУНКЦИЙ ДЛЯ HTML =====
window.addUser = addUser;
window.editUser = editUser;
window.deleteUser = deleteUser;
window.createReport = createReport;
window.downloadReport = downloadReport;
window.deleteReport = deleteReport;
window.saveSettings = saveSettings;
window.logout = logout;
window.approveUser = approveUser;
window.rejectUser = rejectUser;