/**
 * College Portal — API Client
 * Connects to: https://college-portal-api-production.up.railway.app
 */

const API = (() => {
  const BASE = 'https://college-portal-api-production.up.railway.app/api/v1';

  // ── Token Storage ─────────────────────────────────────────────────────────
  const getToken = () => localStorage.getItem('cp_access_token');
  const getRefresh = () => localStorage.getItem('cp_refresh_token');
  const getUser = () => { try { return JSON.parse(localStorage.getItem('cp_user') || 'null'); } catch { return null; } };

  const saveAuth = ({ accessToken, refreshToken, user }) => {
    localStorage.setItem('cp_access_token', accessToken);
    if (refreshToken) localStorage.setItem('cp_refresh_token', refreshToken);
    localStorage.setItem('cp_user', JSON.stringify(user));
  };

  const clearAuth = () => {
    localStorage.removeItem('cp_access_token');
    localStorage.removeItem('cp_refresh_token');
    localStorage.removeItem('cp_user');
  };

  // ── Core Request ──────────────────────────────────────────────────────────
  const request = async (method, path, body = null, retry = true) => {
    const headers = { 'Content-Type': 'application/json' };
    const token = getToken();
    if (token) headers['Authorization'] = `Bearer ${token}`;

    const opts = { method, headers };
    if (body) opts.body = JSON.stringify(body);

    let res = await fetch(BASE + path, opts);

    // Auto-refresh on 401
    if (res.status === 401 && retry) {
      const refreshed = await refreshTokens();
      if (refreshed) return request(method, path, body, false);
      clearAuth();
      window.location.href = '/login.html';
      return null;
    }

    if (!res.ok) {
      const err = await res.json().catch(() => ({ error: 'Request failed' }));
      throw new Error(err.error || err.message || `HTTP ${res.status}`);
    }

    return res.json();
  };

  const refreshTokens = async () => {
    const rt = getRefresh();
    if (!rt) return false;
    try {
      const res = await fetch(BASE + '/auth/refresh', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ refreshToken: rt }),
      });
      if (!res.ok) return false;
      const data = await res.json();
      saveAuth(data);
      return true;
    } catch { return false; }
  };

  const get = (path) => request('GET', path);
  const post = (path, body) => request('POST', path, body);
  const patch = (path, body) => request('PATCH', path, body);
  const del = (path) => request('DELETE', path);

  // ── Auth ──────────────────────────────────────────────────────────────────
  const login = async (email, password) => {
    const data = await fetch(BASE + '/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password }),
    });
    if (!data.ok) {
      const err = await data.json().catch(() => ({}));
      throw new Error(err.error || 'Invalid email or password');
    }
    const result = await data.json();
    saveAuth(result);
    return result;
  };

  const logout = async () => {
    const rt = getRefresh();
    if (rt) await post('/auth/logout', { refreshToken: rt }).catch(() => {});
    clearAuth();
    window.location.href = '../login.html';
  };

  const me = () => get('/auth/me');

  // ── Guards ────────────────────────────────────────────────────────────────
  const requireAuth = (expectedRole) => {
    const user = getUser();
    if (!user || !getToken()) {
      window.location.href = '../login.html';
      return null;
    }
    if (expectedRole && user.role !== expectedRole) {
      window.location.href = '../login.html';
      return null;
    }
    return user;
  };

  // ── Students ──────────────────────────────────────────────────────────────
  const student = {
    list: (params = {}) => get('/students?' + new URLSearchParams(params)),
    get: (id) => get(`/students/${id}`),
    courses: (id) => get(`/students/${id}/courses`),
    grades: (id) => get(`/students/${id}/grades`),
    attendance: (id) => get(`/students/${id}/attendance`),
    invoices: (id) => get(`/students/${id}/invoices`),
    documents: (id) => get(`/students/${id}/documents`),
    transcript: (id) => get(`/grades/students/${id}/transcript`),
  };

  // ── Courses ───────────────────────────────────────────────────────────────
  const courses = {
    list: (params = {}) => get('/courses?' + new URLSearchParams(params)),
    get: (id) => get(`/courses/${id}`),
    enroll: (id) => post(`/courses/${id}/enroll`, {}),
  };

  // ── Grades ────────────────────────────────────────────────────────────────
  const grades = {
    byCourse: (courseId) => get(`/grades/courses/${courseId}`),
    upsert: (courseId, body) => post(`/grades/courses/${courseId}`, body),
    finalize: (courseId) => post(`/grades/courses/${courseId}/final`, {}),
    transcript: (studentId) => get(`/grades/students/${studentId}/transcript`),
  };

  // ── Attendance ────────────────────────────────────────────────────────────
  const attendance = {
    openSession: (body) => post('/attendance/sessions', body),
    getSession: (id) => get(`/attendance/sessions/${id}`),
    markRecords: (sessionId, records) => post(`/attendance/sessions/${sessionId}/records`, { records }),
    courseSummary: (courseId) => get(`/attendance/courses/${courseId}/summary`),
    studentSummary: (studentId) => get(`/attendance/students/${studentId}/summary`),
  };

  // ── Fees ──────────────────────────────────────────────────────────────────
  const fees = {
    invoices: (params = {}) => get('/fees/invoices?' + new URLSearchParams(params)),
    myInvoices: () => get('/fees/invoices/my'),
    submitPayment: (invoiceId, body) => post(`/fees/invoices/${invoiceId}/payments`, body),
  };

  // ── Assignments ───────────────────────────────────────────────────────────
  const assignments = {
    byCourse: (courseId) => get(`/assignments/courses/${courseId}`),
    get: (id) => get(`/assignments/${id}`),
    submit: (id, body) => post(`/assignments/${id}/submit`, body),
    submissions: (id) => get(`/assignments/${id}/submissions`),
    grade: (submissionId, body) => patch(`/assignments/submissions/${submissionId}/grade`, body),
  };

  // ── Timetable ─────────────────────────────────────────────────────────────
  const timetable = {
    all: (params = {}) => get('/timetable?' + new URLSearchParams(params)),
    student: (studentId) => get(`/timetable/student/${studentId}`),
    staff: (staffId) => get(`/timetable/staff/${staffId}`),
  };

  // ── Notifications ─────────────────────────────────────────────────────────
  const notifications = {
    list: () => get('/notifications'),
    markRead: (id) => patch(`/notifications/${id}/read`, {}),
    markAllRead: () => post('/notifications/read-all', {}),
  };

  // ── Announcements ─────────────────────────────────────────────────────────
  const announcements = {
    list: () => get('/announcements'),
  };

  // ── Leave ─────────────────────────────────────────────────────────────────
  const leave = {
    list: () => get('/leave'),
    apply: (body) => post('/leave', body),
    review: (id, body) => patch(`/leave/${id}/review`, body),
  };

  // ── Admin ─────────────────────────────────────────────────────────────────
  const admin = {
    dashboard: () => get('/admin/dashboard'),
    colleges: () => get('/admin/colleges'),
    reportGrades: (params = {}) => get('/admin/reports/grades?' + new URLSearchParams(params)),
    reportAttendance: () => get('/admin/reports/attendance'),
    reportFees: () => get('/admin/reports/fees'),
    staff: (params = {}) => get('/admin/staff?' + new URLSearchParams(params)),
  };

  // ── Staff ─────────────────────────────────────────────────────────────────
  const staff = {
    list: () => get('/staff'),
    get: (id) => get(`/staff/${id}`),
    courses: (id) => get(`/staff/${id}/courses`),
  };

  // ── Documents ─────────────────────────────────────────────────────────────
  const documents = {
    list: () => get('/documents'),
    upload: (body) => post('/documents', body),
    verify: (id) => post(`/documents/${id}/verify`, {}),
  };

  // ── Helpers ───────────────────────────────────────────────────────────────
  const greeting = () => {
    const h = new Date().getHours();
    if (h < 12) return 'Good morning';
    if (h < 17) return 'Good afternoon';
    return 'Good evening';
  };

  const timeAgo = (dateStr) => {
    const diff = Date.now() - new Date(dateStr);
    const mins = Math.floor(diff / 60000);
    if (mins < 1) return 'just now';
    if (mins < 60) return `${mins}m ago`;
    const hrs = Math.floor(mins / 60);
    if (hrs < 24) return `${hrs}h ago`;
    const days = Math.floor(hrs / 24);
    if (days < 7) return `${days}d ago`;
    return new Date(dateStr).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' });
  };

  const daysUntil = (dateStr) => {
    const diff = new Date(dateStr) - Date.now();
    return Math.ceil(diff / (1000 * 60 * 60 * 24));
  };

  const formatCurrency = (n) => '€' + parseFloat(n || 0).toFixed(2).replace(/\B(?=(\d{3})+(?!\d))/g, ',');

  const initials = (first, last) => ((first?.[0] || '') + (last?.[0] || '')).toUpperCase();

  return {
    login, logout, me, requireAuth, getUser, clearAuth, saveAuth,
    student, courses, grades, attendance, fees, assignments,
    timetable, notifications, announcements, leave, admin, staff, documents,
    greeting, timeAgo, daysUntil, formatCurrency, initials,
  };
})();
