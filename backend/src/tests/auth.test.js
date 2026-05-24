// ============================================================
// HAYAT API — Auth Tests
// Usage: npm test
// ============================================================
import { describe, it, before, after } from 'node:test';
import assert from 'node:assert';

const API = 'http://localhost:3001/api';
const TEST_USER = {
  email: `test_${Date.now()}@hayat.app`,
  password: 'TestPass123',
  full_name: 'Test Kullanıcı',
};

let accessToken = null;
let refreshToken = null;

// ─── Helper ───────────────────────────────────────────────
async function req(method, path, body, token) {
  const headers = { 'Content-Type': 'application/json' };
  if (token) headers['Authorization'] = `Bearer ${token}`;
  const opts = { method, headers };
  if (body) opts.body = JSON.stringify(body);
  const res = await fetch(`${API}${path}`, opts);
  return { status: res.status, data: await res.json() };
}

// ─── Tests ────────────────────────────────────────────────

describe('Auth API', () => {

  it('POST /auth/register — yeni kullanıcı oluşturur', async () => {
    const { status, data } = await req('POST', '/auth/register', TEST_USER);
    assert.strictEqual(status, 201);
    assert.strictEqual(data.success, true);
    assert.ok(data.data.accessToken);
    assert.ok(data.data.refreshToken);
    assert.strictEqual(data.data.user.email, TEST_USER.email);
    accessToken = data.data.accessToken;
    refreshToken = data.data.refreshToken;
  });

  it('POST /auth/register — duplicate email 409 döner', async () => {
    const { status, data } = await req('POST', '/auth/register', TEST_USER);
    assert.strictEqual(status, 409);
    assert.strictEqual(data.success, false);
  });

  it('POST /auth/login — doğru bilgilerle giriş yapar', async () => {
    const { status, data } = await req('POST', '/auth/login', {
      email: TEST_USER.email,
      password: TEST_USER.password,
    });
    assert.strictEqual(status, 200);
    assert.ok(data.data.accessToken);
    accessToken = data.data.accessToken;
    refreshToken = data.data.refreshToken;
  });

  it('POST /auth/login — yanlış şifre 401 döner', async () => {
    const { status } = await req('POST', '/auth/login', {
      email: TEST_USER.email,
      password: 'wrongpassword',
    });
    assert.strictEqual(status, 401);
  });

  it('GET /auth/me — profil bilgilerini döner', async () => {
    const { status, data } = await req('GET', '/auth/me', null, accessToken);
    assert.strictEqual(status, 200);
    assert.strictEqual(data.data.email, TEST_USER.email);
    assert.ok(data.data.stats);
  });

  it('GET /auth/me — token olmadan 401 döner', async () => {
    const { status } = await req('GET', '/auth/me');
    assert.strictEqual(status, 401);
  });

  it('POST /auth/refresh — yeni token üretir', async () => {
    const { status, data } = await req('POST', '/auth/refresh', { refreshToken });
    assert.strictEqual(status, 200);
    assert.ok(data.data.accessToken);
  });

  it('PUT /auth/me — profil günceller', async () => {
    const { status, data } = await req('PUT', '/auth/me', {
      full_name: 'Güncellenmiş İsim',
    }, accessToken);
    assert.strictEqual(status, 200);
    assert.strictEqual(data.data.full_name, 'Güncellenmiş İsim');
  });

  it('POST /auth/logout — çıkış yapar', async () => {
    const { status, data } = await req('POST', '/auth/logout', {}, accessToken);
    assert.strictEqual(status, 200);
    assert.strictEqual(data.success, true);
  });
});

describe('Validation', () => {

  it('POST /auth/register — kısa şifre reddeder', async () => {
    const { status, data } = await req('POST', '/auth/register', {
      email: 'x@y.com', password: '123', full_name: 'Test',
    });
    assert.strictEqual(status, 400);
    assert.strictEqual(data.error.code, 'VALIDATION_ERROR');
  });

  it('POST /auth/register — geçersiz email reddeder', async () => {
    const { status } = await req('POST', '/auth/register', {
      email: 'notanemail', password: 'Test1234', full_name: 'Test',
    });
    assert.strictEqual(status, 400);
  });
});

describe('Health', () => {

  it('GET /health — 200 döner', async () => {
    const res = await fetch(`${API.replace('/api', '')}/health`);
    assert.strictEqual(res.status, 200);
    const data = await res.json();
    assert.strictEqual(data.status, 'ok');
  });
});
