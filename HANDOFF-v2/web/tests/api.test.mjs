import assert from 'node:assert/strict';
import test from 'node:test';

const values = new Map();
globalThis.window = {
  sessionStorage: {
    getItem: (key) => values.get(key) ?? null,
    setItem: (key, value) => values.set(key, String(value)),
    removeItem: (key) => values.delete(key),
  },
  localStorage: {
    getItem: () => null,
    setItem: () => {},
    removeItem: () => {},
  },
};

const { apiRequest } = await import('../app/lib/api.js');
const { getToken, setToken } = await import('../app/lib/storage.js');

test('401 очищает просроченный токен', async () => {
  setToken('expired-token');
  globalThis.fetch = async () => new Response(JSON.stringify({ error: 'нужен вход' }), {
    status: 401, headers: { 'Content-Type': 'application/json' },
  });
  await assert.rejects(() => apiRequest('/api/account'), (error) => error.status === 401);
  assert.equal(getToken(), '');
});

test('402 и обычные ошибки не завершают сессию', async () => {
  setToken('valid-token');
  globalThis.fetch = async () => new Response(JSON.stringify({ error: 'недостаточно кредитов' }), {
    status: 402, headers: { 'Content-Type': 'application/json' },
  });
  await assert.rejects(() => apiRequest('/api/generate'), (error) => error.status === 402);
  assert.equal(getToken(), 'valid-token');
});

