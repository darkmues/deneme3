// ============================================================
// HAYAT Mobile — API Service
// HTTP client with JWT auto-refresh + secure token storage
// ============================================================
import * as SecureStore from 'expo-secure-store';
import env from '../config/env';

const API_URL = env.API_URL;

const TOKEN_KEY = 'hayat_access_token';
const REFRESH_KEY = 'hayat_refresh_token';

class ApiService {
  constructor() {
    this.accessToken = null;
    this.refreshToken = null;
    this.onAuthError = null; // callback for logout
    this._refreshPromise = null;
  }

  // ─── Token Management ───────────────────────────────────
  async loadTokens() {
    try {
      this.accessToken = await SecureStore.getItemAsync(TOKEN_KEY);
      this.refreshToken = await SecureStore.getItemAsync(REFRESH_KEY);
    } catch (e) {
      console.warn('[API] Failed to load tokens:', e);
    }
  }

  async saveTokens(access, refresh) {
    this.accessToken = access;
    this.refreshToken = refresh;
    try {
      await SecureStore.setItemAsync(TOKEN_KEY, access);
      if (refresh) await SecureStore.setItemAsync(REFRESH_KEY, refresh);
    } catch (e) {
      console.warn('[API] Failed to save tokens:', e);
    }
  }

  async clearTokens() {
    this.accessToken = null;
    this.refreshToken = null;
    try {
      await SecureStore.deleteItemAsync(TOKEN_KEY);
      await SecureStore.deleteItemAsync(REFRESH_KEY);
    } catch (e) {}
  }

  // ─── Token Refresh ──────────────────────────────────────
  async _refreshAccessToken() {
    if (this._refreshPromise) return this._refreshPromise;

    this._refreshPromise = (async () => {
      try {
        if (!this.refreshToken) throw new Error('No refresh token');
        const res = await fetch(`${API_URL}/auth/refresh`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ refreshToken: this.refreshToken }),
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.error?.message || 'Refresh failed');
        await this.saveTokens(data.data.accessToken, data.data.refreshToken || this.refreshToken);
        return true;
      } catch (error) {
        await this.clearTokens();
        if (this.onAuthError) this.onAuthError();
        return false;
      } finally {
        this._refreshPromise = null;
      }
    })();

    return this._refreshPromise;
  }

  // ─── Core Request ───────────────────────────────────────
  async request(method, path, body = null, retry = true) {
    const headers = { 'Content-Type': 'application/json' };
    if (this.accessToken) headers['Authorization'] = `Bearer ${this.accessToken}`;

    const opts = { method, headers };
    if (body && method !== 'GET') opts.body = JSON.stringify(body);

    try {
      const res = await fetch(`${API_URL}${path}`, opts);

      // Auto-refresh on 401
      if (res.status === 401 && retry && this.refreshToken) {
        const refreshed = await this._refreshAccessToken();
        if (refreshed) {
          return this.request(method, path, body, false);
        }
      }

      const data = await res.json();
      if (!res.ok) {
        const error = new Error(data.error?.message || 'Bir hata oluştu');
        error.code = data.error?.code;
        error.status = res.status;
        error.details = data.error?.details;
        throw error;
      }
      return data;
    } catch (error) {
      if (error.status) throw error;
      // Network error
      const netError = new Error('Bağlantı hatası. İnternet bağlantınızı kontrol edin.');
      netError.code = 'NETWORK_ERROR';
      throw netError;
    }
  }

  // ─── HTTP Methods ───────────────────────────────────────
  get(path) { return this.request('GET', path); }
  post(path, body) { return this.request('POST', path, body); }
  put(path, body) { return this.request('PUT', path, body); }
  patch(path, body) { return this.request('PATCH', path, body); }
  del(path) { return this.request('DELETE', path); }

  // ─── Auth ───────────────────────────────────────────────
  async login(email, password) {
    const data = await this.post('/auth/login', { email, password });
    await this.saveTokens(data.data.accessToken, data.data.refreshToken);
    return data.data;
  }

  async register(email, password, full_name) {
    const data = await this.post('/auth/register', { email, password, full_name });
    await this.saveTokens(data.data.accessToken, data.data.refreshToken);
    return data.data;
  }

  async logout() {
    try {
      await this.post('/auth/logout', {});
    } catch (e) {}
    await this.clearTokens();
  }

  // ─── Dashboard ──────────────────────────────────────────
  getDashboard() { return this.get('/dashboard'); }
  getInsights() { return this.get('/ai/insights'); }

  // ─── Tasks ──────────────────────────────────────────────
  getTasks(params = {}) {
    const qs = new URLSearchParams();
    Object.entries(params).forEach(([k, v]) => { if (v && v !== 'all') qs.set(k, v); });
    return this.get(`/tasks?${qs}`);
  }
  getTask(id) { return this.get(`/tasks/${id}`); }
  createTask(data) { return this.post('/tasks', data); }
  updateTask(id, data) { return this.put(`/tasks/${id}`, data); }
  deleteTask(id) { return this.del(`/tasks/${id}`); }
  getTaskStats() { return this.get('/tasks/stats/overview'); }

  // ─── Finance ────────────────────────────────────────────
  getTransactions(params = {}) {
    const qs = new URLSearchParams();
    Object.entries(params).forEach(([k, v]) => { if (v && v !== 'all') qs.set(k, v); });
    return this.get(`/finance/transactions?${qs}`);
  }
  createTransaction(data) { return this.post('/finance/transactions', data); }
  deleteTransaction(id) { return this.del(`/finance/transactions/${id}`); }
  getFinanceAnalytics(period = 'month') { return this.get(`/finance/analytics/summary?period=${period}`); }
  getBudgets() { return this.get('/finance/budgets'); }
  getAccounts() { return this.get('/finance/accounts'); }

  // ─── Habits ─────────────────────────────────────────────
  getHabits() { return this.get('/habits'); }
  createHabit(data) { return this.post('/habits', data); }
  completeHabit(id) { return this.post(`/habits/${id}/complete`, {}); }
  uncompleteHabit(id) { return this.del(`/habits/${id}/complete`); }
  getHabitAnalytics(days = 30) { return this.get(`/habits/analytics/overview?days=${days}`); }

  // ─── AI ─────────────────────────────────────────────────
  sendAIMessage(message, conversationId = null) {
    return this.post('/ai/chat', { message, conversation_id: conversationId });
  }
  getWeeklyReport() { return this.get('/ai/weekly-report'); }

  // ─── Categories ─────────────────────────────────────────
  getCategories(module) { return this.get(`/categories?module=${module}`); }

  // ─── Notifications ──────────────────────────────────────
  getNotifications() { return this.get('/notifications'); }
  markNotificationRead(id) { return this.put(`/notifications/${id}/read`); }
  markAllRead() { return this.put('/notifications/read-all'); }

  // ─── Profile ────────────────────────────────────────────
  getProfile() { return this.get('/auth/me'); }
  updateProfile(data) { return this.put('/auth/me', data); }
}

export const api = new ApiService();
export default api;
