// Интеграционная проверка: пользователь видит и меняет только свои данные.
process.env.PROJECT_DRIVE_DB_PATH = ':memory:';
process.env.PROJECT_DRIVE_PORT = '0';

import assert from 'node:assert/strict';
import { once } from 'node:events';

const { server } = await import('./server.mjs');
const db = await import('./db.mjs');
if (!server.listening) await once(server, 'listening');

const address = server.address();
const base = `http://127.0.0.1:${address.port}`;

async function json(path, { token, method = 'GET', body } = {}) {
  const response = await fetch(base + path, {
    method,
    headers: {
      ...(body === undefined ? {} : { 'Content-Type': 'application/json' }),
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    ...(body === undefined ? {} : { body: JSON.stringify(body) }),
  });
  return { response, data: await response.json() };
}

try {
  const ownerRegistration = await json('/api/auth/register', {
    method: 'POST', body: { email: 'owner@example.com', password: 'secret123', name: 'Owner' },
  });
  const strangerRegistration = await json('/api/auth/register', {
    method: 'POST', body: { email: 'stranger@example.com', password: 'secret123', name: 'Stranger' },
  });
  assert.equal(ownerRegistration.response.status, 201);
  assert.equal(strangerRegistration.response.status, 201);
  const ownerToken = ownerRegistration.data.token;
  const strangerToken = strangerRegistration.data.token;

  const created = await json('/api/projects', {
    token: ownerToken, method: 'POST', body: { name: 'Owner car' },
  });
  assert.equal(created.response.status, 201);
  const projectId = created.data.id;
  db.addSourceAsset({ projectId, url: '/uploads/00000000-0000-4000-8000-000000000000.jpg' });
  const versionId = db.createVersion({
    projectId,
    config: [{ kind: 'wrap', color: 'Green', finish: 'Satin' }],
    outputUrl: '/uploads/00000000-0000-4000-8000-000000000000.jpg',
    creditsCharged: 25,
  });

  const strangerProjects = await json('/api/projects', { token: strangerToken });
  assert.equal(strangerProjects.response.status, 200);
  assert.deepEqual(strangerProjects.data, []);

  const forbiddenRequests = [
    json(`/api/projects/${projectId}`, { token: strangerToken, method: 'PATCH', body: { name: 'Stolen' } }),
    json(`/api/versions?projectId=${projectId}`, { token: strangerToken }),
    json(`/api/versions/${versionId}`, { token: strangerToken }),
    json(`/api/versions/${versionId}/report`, {
      token: strangerToken, method: 'POST', body: { reason: 'other', note: 'Not mine' },
    }),
    json('/api/generate', {
      token: strangerToken, method: 'POST',
      body: { projectId, operations: [{ kind: 'wrap', color: 'Blue', finish: 'Gloss' }] },
    }),
  ];
  const forbiddenResponses = await Promise.all(forbiddenRequests);
  for (const { response } of forbiddenResponses) assert.equal(response.status, 404);

  const forbiddenUpload = await fetch(`${base}/api/upload?projectId=${encodeURIComponent(projectId)}`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${strangerToken}`, 'Content-Type': 'image/jpeg' },
    body: new Uint8Array([1, 2, 3]),
  });
  assert.equal(forbiddenUpload.status, 404);

  const ownerVersion = await json(`/api/versions/${versionId}`, { token: ownerToken });
  assert.equal(ownerVersion.response.status, 200);
  assert.equal(ownerVersion.data.projectId, projectId);

  const firstReport = await json(`/api/versions/${versionId}/report`, {
    token: ownerToken, method: 'POST', body: { reason: 'other', note: 'Owner report' },
  });
  const repeatedReport = await json(`/api/versions/${versionId}/report`, {
    token: ownerToken, method: 'POST', body: { reason: 'other', note: 'Repeated' },
  });
  assert.equal(firstReport.response.status, 201);
  assert.equal(repeatedReport.response.status, 201);
  assert.equal(repeatedReport.data.already, true);

  console.log('✅ Проекты, версии, uploads, генерация и жалобы изолированы по владельцу.');
} finally {
  await new Promise((resolve, reject) => server.close((error) => error ? reject(error) : resolve()));
}

