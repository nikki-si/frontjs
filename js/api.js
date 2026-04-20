// настройки API 
const API_BASE_URL = 'http://localhost:8000';

// вспомогательные функции 

function getToken() {
    return localStorage.getItem('jwt_token');
}

function setToken(token) {
    localStorage.setItem('jwt_token', token);
}

function clearToken() {
    localStorage.removeItem('jwt_token');
    localStorage.removeItem('userRole');
    localStorage.removeItem('userEmail');
    localStorage.removeItem('userName');
    localStorage.removeItem('isLoggedIn');
}

function getAuthHeaders() {
    const token = getToken();
    return {
        'Content-Type': 'application/json',
        'Authorization': token ? `Bearer ${token}` : ''
    };
}

async function apiRequest(endpoint, options = {}) {
    const url = `${API_BASE_URL}${endpoint}`;
    
    const config = {
        ...options,
        headers: {
            ...getAuthHeaders(),
            ...options.headers
        }
    };
    
    try {
        const response = await fetch(url, config);
        
        if (response.status === 401) {
            clearToken();
            window.location.href = 'index.html';
            throw new Error('Необходима авторизация');
        }
        
        if (!response.ok) {
            const error = await response.json().catch(() => ({}));
            throw new Error(error.detail || `Ошибка: ${response.status}`);
        }
        
        // Для 204 No Content
        if (response.status === 204) {
            return null;
        }
        
        return await response.json();
    } catch (error) {
        console.error('API Error:', error);
        throw error;
    }
}

// ===== АУТЕНТИФИКАЦИЯ =====

async function registerUser(email, password, fullName, role) {
    return apiRequest('/auth/register', {
        method: 'POST',
        body: JSON.stringify({
            email,
            password,
            full_name: fullName,
            role: role
        })
    });
}

async function loginUser(email, password) {
    const formData = new FormData();
    formData.append('username', email);
    formData.append('password', password);
    
    const response = await fetch(`${API_BASE_URL}/auth/login`, {
        method: 'POST',
        body: formData
    });
    
    if (!response.ok) {
        const error = await response.json().catch(() => ({}));
        throw new Error(error.detail || 'Ошибка входа');
    }
    
    const data = await response.json();
    
    if (data.access_token) {
        setToken(data.access_token);
        const userData = JSON.parse(atob(data.access_token.split('.')[1]));
        localStorage.setItem('userRole', userData.role);
        localStorage.setItem('userName', userData.full_name || userData.sub);
    }
    
    return data;
}

async function getCurrentUser() {
    return apiRequest('/auth/me');
}

async function logoutUser() {
    try {
        await apiRequest('/auth/logout', { method: 'POST' });
    } catch (error) {
        console.error('Ошибка выхода:', error);
    }
    clearToken();
}

async function changePassword(oldPassword, newPassword) {
    const formData = new FormData();
    formData.append('old_password', oldPassword);
    formData.append('new_password', newPassword);
    
    const response = await fetch(`${API_BASE_URL}/auth/change-password`, {
        method: 'POST',
        headers: {
            'Authorization': `Bearer ${getToken()}`
        },
        body: formData
    });
    
    if (!response.ok) {
        const error = await response.json().catch(() => ({}));
        throw new Error(error.detail || 'Ошибка смены пароля');
    }
    
    return await response.json();
}

// ===== ГРУППЫ =====

async function getGroups() {
    return apiRequest('/groups/');
}

async function getMyGroups() {
    return apiRequest('/groups/me');
}

async function getGroup(groupId) {
    return apiRequest(`/groups/${groupId}`);
}

async function createGroup(groupData) {
    return apiRequest('/groups/', {
        method: 'POST',
        body: JSON.stringify(groupData)
    });
}

async function updateGroup(groupId, groupData) {
    return apiRequest(`/groups/${groupId}`, {
        method: 'PUT',
        body: JSON.stringify(groupData)
    });
}

async function deleteGroup(groupId) {
    return apiRequest(`/groups/${groupId}`, {
        method: 'DELETE'
    });
}

// ===== ДЕТИ =====

async function getChildren(groupId = null) {
    const url = groupId ? `/children/?group_id=${groupId}` : '/children/';
    return apiRequest(url);
}

async function getChildrenByGroup(groupId) {
    return getChildren(groupId);
}

async function createChild(childData) {
    return apiRequest('/children/', {
        method: 'POST',
        body: JSON.stringify(childData)
    });
}

// ===== ПОСЕЩАЕМОСТЬ =====

async function getDailyJournal(groupId, date) {
    return apiRequest(`/attendance/group/${groupId}/date/${date}`);
}

async function getAttendance(groupId, year, month) {
    const daysInMonth = new Date(year, month, 0).getDate();
    const attendance = [];
    
    for (let day = 1; day <= daysInMonth; day++) {
        const date = `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
        try {
            const journal = await getDailyJournal(groupId, date);
            if (journal && journal.records) {
                attendance.push(...journal.records);
            }
        } catch (error) {
            console.error(`Ошибка загрузки за ${date}:`, error);
        }
    }
    
    return attendance;
}

async function markAttendance(childId, date, status, comment = '') {
    return apiRequest('/attendance/', {
        method: 'POST',
        body: JSON.stringify({
            child_id: childId,
            date: date,
            status: status,
            comment: comment
        })
    });
}

async function markAttendanceBulk(groupId, date, status) {
    // Получаем всех детей группы
    const children = await getChildren(groupId);
    
    // Создаём объект attendance_data: { "child_id": "status" }
    const attendanceData = {};
    children.forEach(child => {
        attendanceData[child.id] = status;
    });
    
    return apiRequest('/attendance/bulk', {
        method: 'POST',
        body: JSON.stringify({
            group_id: parseInt(groupId),
            date: date,
            attendance_data: attendanceData,
            default_status: status
        })
    });
}

async function updateAttendance(attendanceId, status, comment = '') {
    return apiRequest(`/attendance/${attendanceId}`, {
        method: 'PUT',
        body: JSON.stringify({
            status: status,
            comment: comment
        })
    });
}

async function deleteAttendance(attendanceId) {
    return apiRequest(`/attendance/${attendanceId}`, {
        method: 'DELETE'
    });
}

async function getChildAttendanceHistory(childId, startDate = null, endDate = null) {
    let url = `/attendance/child/${childId}/history`;
    const params = [];
    if (startDate) params.push(`start_date=${startDate}`);
    if (endDate) params.push(`end_date=${endDate}`);
    if (params.length) url += '?' + params.join('&');
    return apiRequest(url);
}

async function getAttendanceStats(groupId, year, month) {
    const attendance = await getAttendance(groupId, year, month);
    const children = await getChildren(groupId);
    
    const totalChildren = children.length;
    let totalPresent = 0;
    let totalDays = 0;
    const byDay = {};
    
    attendance.forEach(record => {
        const day = new Date(record.date).getDate();
        if (!byDay[day]) {
            byDay[day] = { present: 0, total: totalChildren };
        }
        if (record.status === 'present') {
            byDay[day].present++;
            totalPresent++;
        }
        totalDays++;
    });
    
    const attendanceRate = totalDays > 0 ? (totalPresent / (totalChildren * Object.keys(byDay).length)) * 100 : 0;
    
    return {
        total_children: totalChildren,
        total_present: totalPresent,
        total_days: totalDays,
        attendance_rate: attendanceRate,
        by_day: byDay
    };
}

// ===== ПЛАТЕЖИ И ОТЧЁТЫ =====

async function getGroupPaymentReport(groupId, month) {
    return apiRequest(`/payments/report/group/${groupId}?month=${month}`);
}

async function autoCalculatePayments(targetMonth) {
    return apiRequest(`/payments/auto-calculate/${targetMonth}`, {
        method: 'POST'
    });
}

async function createPayment(paymentData) {
    return apiRequest('/payments/', {
        method: 'POST',
        body: JSON.stringify(paymentData)
    });
}

async function getChildPayments(childId, startMonth = null, endMonth = null) {
    let url = `/payments/child/${childId}`;
    const params = [];
    if (startMonth) params.push(`start_month=${startMonth}`);
    if (endMonth) params.push(`end_month=${endMonth}`);
    if (params.length) url += '?' + params.join('&');
    return apiRequest(url);
}

async function updatePayment(paymentId, paymentData) {
    return apiRequest(`/payments/${paymentId}`, {
        method: 'PUT',
        body: JSON.stringify(paymentData)
    });
}

async function deletePayment(paymentId) {
    return apiRequest(`/payments/${paymentId}`, {
        method: 'DELETE'
    });
}

async function generateReport(reportType, groupId, month) {
    if (reportType === 'attendance' || reportType === 'monthly') {
        const [year, monthNum] = month.split('-');
        return await getAttendanceStats(groupId, parseInt(year), parseInt(monthNum));
    }
    
    if (reportType === 'financial') {
        return await getGroupPaymentReport(groupId, month);
    }
    
    return { message: 'Отчёт сгенерирован' };
}

async function exportToExcel(groupId, month) {
    const [year, monthNum] = month.split('-');
    const stats = await getAttendanceStats(groupId, parseInt(year), parseInt(monthNum));
    
    let csv = 'День,Присутствовало,Всего,Процент\n';
    Object.entries(stats.by_day).forEach(([day, data]) => {
        const percent = ((data.present / data.total) * 100).toFixed(1);
        csv += `${day},${data.present},${data.total},${percent}%\n`;
    });
    
    const blob = new Blob(['\ufeff' + csv], { type: 'text/csv;charset=utf-8;' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `attendance_group_${groupId}_${month}.csv`;
    a.click();
    window.URL.revokeObjectURL(url);
    
    return { success: true };
}

// ===== AI ПРОГНОЗЫ =====

async function getAIPrediction(groupId, targetDate = null) {
    let url = `/ai/predictions/group/${groupId}`;
    if (targetDate) url += `?target_date=${targetDate}`;
    return apiRequest(url);
}

async function trainAIModel() {
    return apiRequest('/ai/train', { method: 'POST' });
}

async function trainPaymentModel() {
    return apiRequest('/ai/payments/train', { method: 'POST' });
}

async function getPaymentPrediction(groupId, targetMonth = null) {
    let url = `/ai/payments/predict/group/${groupId}`;
    if (targetMonth) url += `?target_month=${targetMonth}`;
    return apiRequest(url);
}

// ===== АУДИТ ЛОГИ =====

async function getAuditLogs(params = {}) {
    const queryParams = [];
    
    // Проверяем что params не null и не undefined
    if (params && typeof params === 'object') {
        if (params.limit) queryParams.push(`limit=${params.limit}`);
        if (params.user_id) queryParams.push(`user_id=${params.user_id}`);
        if (params.action) queryParams.push(`action=${params.action}`);
        if (params.resource) queryParams.push(`resource=${params.resource}`);
        if (params.start_date) queryParams.push(`start_date=${params.start_date}`);
        if (params.end_date) queryParams.push(`end_date=${params.end_date}`);
    }
    
    const url = queryParams.length ? `/audit/logs?${queryParams.join('&')}` : '/audit/logs';
    return apiRequest(url);
}

async function getAuditStats() {
    return apiRequest('/audit/stats');
}

// ===== ЗДОРОВЬЕ =====

async function healthCheck() {
    try {
        const response = await fetch(`${API_BASE_URL}/health`);
        return response.ok;
    } catch {
        return false;
    }
}

console.log('✅ API загружен (v3.0 - полное соответствие бэкенду)');