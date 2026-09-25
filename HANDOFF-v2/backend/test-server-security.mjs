// HTTP-регрессия для маршрутов, которые нельзя случайно снова открыть.
// Сервер запускается на случайном локальном порту и использует базу в памяти.
process.env.PROJECT_DRIVE_DB_PATH = ':memory:';
process.env.PROJECT_DRIVE_PORT = '0';

import assert from 'node:assert/strict';
import { once } from 'node:events';
import sharp from 'sharp';

const { server } = await import('./server.mjs');
if (!server.listening) await once(server, 'listening');

const address = server.address();
const base = `http://127.0.0.1:${address.port}`;

try {
  const root = await fetch(`${base}/`, { redirect: 'manual' });
  assert.equal(root.status, 302);
  assert.equal(root.headers.get('location'), 'http://127.0.0.1:3001');

  const health = await fetch(`${base}/api/health`);
  assert.equal(health.status, 200);
  assert.equal(health.headers.get('cache-control'), 'no-store');
  assert.equal(health.headers.get('x-content-type-options'), 'nosniff');
  assert.equal(health.headers.get('referrer-policy'), 'no-referrer');
  assert.match(health.headers.get('x-request-id'), /^[0-9a-f-]{36}$/);

  const ready = await fetch(`${base}/api/ready`);
  assert.equal(ready.status, 200);
  const readiness = await ready.json();
  assert.equal(readiness.ready, true);
  assert.equal(readiness.integrity, 'ok');
  assert.equal(readiness.foreignKeysEnabled, true);
  assert.ok(readiness.migrationCount >= 5);

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

  const registration = await fetch(`${base}/api/auth/register`, {
    method: 'POST', headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: 'payment-guard@example.com', password: 'secret123' }),
  });
  assert.equal(registration.status, 201);
  const { token } = await registration.json();

  // Пользовательский reference-диск хранится отдельно от исходного фото машины
  // и может быть использован только внутри проекта владельца.
  const projectResponse = await fetch(`${base}/api/projects`, {
    method: 'POST', headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
    body: JSON.stringify({ name: 'Reference test car' }),
  });
  assert.equal(projectResponse.status, 201);
  const project = await projectResponse.json();
  const wheelImage = await sharp({ create: { width: 640, height: 640, channels: 3, background: '#888888' } }).jpeg().toBuffer();
  const wheelUpload = await fetch(`${base}/api/wheel-reference?projectId=${encodeURIComponent(project.id)}`, {
    method: 'POST', headers: { 'Content-Type': 'image/jpeg', Authorization: `Bearer ${token}` }, body: wheelImage,
  });
  assert.equal(wheelUpload.status, 201);
  const wheelAsset = await wheelUpload.json();
  const database = await import('./db.mjs');
  assert.equal(database.getLatestSourceAsset(project.id), null, 'reference не подменяет исходное фото машины');
  const resolvedReference = database.resolveCatalogOperations([
    { kind: 'wheel_replace', name: 'Custom wheel reference', referenceAssetId: wheelAsset.id },
  ], { projectId: project.id })[0];
  assert.equal(resolvedReference.referenceImage, wheelAsset.url);
  assert.match(resolvedReference.promptFragment, /exact wheel design/i);

  assert.equal((await fetch(`${base}/api/checkout`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
    body: JSON.stringify({ packId: 'starter' }),
  })).status, 503);
  assert.equal((await fetch(`${base}/api/webhook/payment`, {
    method: 'POST', headers: { 'Content-Type': 'application/json' }, body: '{}',
  })).status, 404);

  for (let attempt = 0; attempt < 5; attempt += 1) {
    const wrongLogin = await fetch(`${base}/api/auth/login`, {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: 'payment-guard@example.com', password: 'wrong-password' }),
    });
    assert.equal(wrongLogin.status, 401);
  }
  const blockedLogin = await fetch(`${base}/api/auth/login`, {
    method: 'POST', headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: 'payment-guard@example.com', password: 'wrong-password' }),
  });
  assert.equal(blockedLogin.status, 429);
  assert.ok(Number(blockedLogin.headers.get('retry-after')) > 0);

  console.log('✅ Корень ведёт в интерфейс; legacy-маршруты, uploads, JSON, mock-платежи и вход защищены.');
} finally {
  await new Promise((resolve, reject) => server.close((error) => error ? reject(error) : resolve()));
}
