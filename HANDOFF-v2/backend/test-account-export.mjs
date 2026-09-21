process.env.PROJECT_DRIVE_DB_PATH = ':memory:';
process.env.PROJECT_DRIVE_PORT = '0';

import assert from 'node:assert/strict';
import { once } from 'node:events';
const { server } = await import('./server.mjs');
const db = await import('./db.mjs');
if (!server.listening) await once(server, 'listening');
const base = `http://127.0.0.1:${server.address().port}`;

async function json(path, { method = 'GET', token, body } = {}) {
  const response = await fetch(base + path, {
    method,
    headers: { ...(token ? { Authorization: `Bearer ${token}` } : {}), ...(body === undefined ? {} : { 'Content-Type': 'application/json' }) },
    ...(body === undefined ? {} : { body: JSON.stringify(body) }),
  });
  return { response, data: await response.json() };
}

try {
  const owner = await json('/api/auth/register', { method: 'POST', body: { email: 'export-owner@example.com', password: 'secret123' } });
  const stranger = await json('/api/auth/register', { method: 'POST', body: { email: 'export-stranger@example.com', password: 'secret123' } });
  const ownerProject = db.createProject({ userId: owner.data.user.id, name: 'Owner car' });
  db.createProject({ userId: stranger.data.user.id, name: 'Stranger car' });
  db.createVersion({ projectId: ownerProject.id, config: [{ kind: 'wrap', color: 'Red' }], creditsCharged: 25 });

  assert.equal((await json('/api/account/export')).response.status, 401);
  const exported = await json('/api/account/export', { token: owner.data.token });
  assert.equal(exported.response.status, 200);
  assert.equal(exported.data.account.email, 'export-owner@example.com');
  assert.deepEqual(exported.data.projects.map((project) => project.name), ['Owner car']);
  assert.equal(JSON.stringify(exported.data).includes('export-stranger@example.com'), false);
  assert.equal(JSON.stringify(exported.data).includes('secret123'), false);
  assert.equal(Object.hasOwn(exported.data, 'sessions'), false);
  console.log('✅ Экспорт содержит только данные владельца и не раскрывает пароль или сессии.');
} finally {
  await new Promise((resolve, reject) => server.close((error) => error ? reject(error) : resolve()));
}
