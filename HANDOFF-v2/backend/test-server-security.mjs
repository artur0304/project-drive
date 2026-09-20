// HTTP-регрессия для маршрутов, которые нельзя случайно снова открыть.
// Сервер запускается на случайном локальном порту и использует базу в памяти.
process.env.PROJECT_DRIVE_DB_PATH = ':memory:';
process.env.PROJECT_DRIVE_PORT = '0';

import assert from 'node:assert/strict';
import { once } from 'node:events';

const { server } = await import('./server.mjs');
if (!server.listening) await once(server, 'listening');

const address = server.address();
const base = `http://127.0.0.1:${address.port}`;

try {
  const health = await fetch(`${base}/api/health`);
  assert.equal(health.status, 200);

  const pricing = await fetch(`${base}/api/pricing`);
  assert.equal(pricing.status, 200);

  // Старые маршруты обходили регистрацию с паролем и раскрывали email.
  assert.equal((await fetch(`${base}/api/users`)).status, 404);
  assert.equal((await fetch(`${base}/api/users`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: 'bypass@example.com', name: 'Bypass' }),
  })).status, 404);

  // Раздача файлов принимает только UUID.jpg, созданный самим сервером.
  assert.equal((await fetch(`${base}/uploads/not-a-server-uuid.jpg`)).status, 404);
  assert.equal((await fetch(`${base}/uploads/%2e%2e%2fserver.mjs`)).status, 404);

  assert.equal((await fetch(`${base}/api/auth/login`, {
    method: 'POST', headers: { 'Content-Type': 'application/json' }, body: '{broken',
  })).status, 400);
  assert.equal((await fetch(`${base}/api/auth/login`, {
    method: 'POST', headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: `${'a'.repeat(70 * 1024)}@example.com`, password: 'secret123' }),
  })).status, 413);

  console.log('✅ Legacy-маршруты закрыты, uploads и размер JSON ограничены.');
} finally {
  await new Promise((resolve, reject) => server.close((error) => error ? reject(error) : resolve()));
}
