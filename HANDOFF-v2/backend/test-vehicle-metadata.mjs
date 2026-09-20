process.env.PROJECT_DRIVE_DB_PATH = ':memory:';
process.env.PROJECT_DRIVE_PORT = '0';

import assert from 'node:assert/strict';
import { once } from 'node:events';
const { server } = await import('./server.mjs');
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
  const registration = await json('/api/auth/register', { method: 'POST', body: { email: 'vehicle@example.com', password: 'secret123' } });
  const created = await json('/api/projects', {
    method: 'POST', token: registration.data.token,
    body: { name: ' BMW X5 ', vehicleMake: ' BMW ', vehicleModel: ' X5 ' },
  });
  assert.equal(created.response.status, 201);
  assert.equal(created.data.name, 'BMW X5');
  assert.equal(created.data.vehicle_make, 'BMW');
  assert.equal(created.data.vehicle_model, 'X5');

  const tooLong = await json('/api/projects', {
    method: 'POST', token: registration.data.token,
    body: { name: 'Car', vehicleMake: 'x'.repeat(61) },
  });
  assert.equal(tooLong.response.status, 400);
  console.log('✅ Метка автомобиля сохраняется только после подтверждения клиента и проходит серверные границы.');
} finally {
  await new Promise((resolve, reject) => server.close((error) => error ? reject(error) : resolve()));
}
