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
    method, headers: { ...(token ? { Authorization: `Bearer ${token}` } : {}), ...(body === undefined ? {} : { 'Content-Type': 'application/json' }) },
    ...(body === undefined ? {} : { body: JSON.stringify(body) }),
  });
  return { response, data: await response.json() };
}

try {
  const owner = await json('/api/auth/register', { method: 'POST', body: { email: 'share-owner@example.com', password: 'secret123' } });
  const stranger = await json('/api/auth/register', { method: 'POST', body: { email: 'share-stranger@example.com', password: 'secret123' } });
  const project = db.createProject({ userId: owner.data.user.id, name: 'Shared car' });
  const versionId = db.createVersion({ projectId: project.id, config: [{ kind: 'wrap', color: 'Red', finish: 'Matte' }], outputUrl: '/uploads/shared.jpg', creditsCharged: 25 });

  assert.equal(db.getPublicShare('missing'), null, 'публичной ссылки нет по умолчанию');
  const enabled = await json(`/api/versions/${versionId}/share`, { method: 'POST', token: owner.data.token, body: { enabled: true } });
  assert.equal(enabled.response.status, 200);
  assert.match(enabled.data.token, /^[a-f0-9]{64}$/);
  const publicResult = await json(`/api/public/results/${enabled.data.token}`);
  assert.equal(publicResult.response.status, 200);
  assert.equal(publicResult.data.projectName, 'Shared car');
  assert.equal(Object.hasOwn(publicResult.data, 'userId'), false);

  const strangerDisable = await json(`/api/versions/${versionId}/share`, { method: 'POST', token: stranger.data.token, body: { enabled: false } });
  assert.equal(strangerDisable.response.status, 404);
  assert.equal((await json(`/api/versions/${versionId}/share`, { method: 'POST', token: owner.data.token, body: { enabled: false } })).response.status, 200);
  assert.equal((await json(`/api/public/results/${enabled.data.token}`)).response.status, 404);

  console.log('✅ Публичная ссылка выключена по умолчанию, доступна без личных данных и отключается только владельцем.');
} finally {
  await new Promise((resolve, reject) => server.close((error) => error ? reject(error) : resolve()));
}
