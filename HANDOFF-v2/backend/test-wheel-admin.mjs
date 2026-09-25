process.env.PROJECT_DRIVE_DB_PATH = ':memory:';
process.env.PROJECT_DRIVE_PORT = '0';
process.env.PROJECT_DRIVE_ADMIN_EMAILS = 'admin@example.com';

import assert from 'node:assert/strict';
import { once } from 'node:events';
import sharp from 'sharp';

const { server } = await import('./server.mjs');
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
  const registration = await json('/api/auth/register', { method: 'POST', body: { email: 'admin@example.com', password: 'secret123' } });
  const token = registration.data.token;
  const created = await json('/api/admin/wheels', {
    method: 'POST', token, body: {
      brand: 'Own Brand', model: 'Road One', sizeLabel: 'R20', diameter: 20, color: 'Silver', finish: 'Satin',
      rightsSource: 'Own studio', rightsBasis: 'Photographed by Project Drive',
    },
  });
  assert.equal(created.response.status, 201);
  const variantId = created.data.id;

  const blocked = await json(`/api/admin/wheels/${variantId}`, { method: 'PATCH', token, body: { visible: true } });
  assert.equal(blocked.response.status, 409);

  const transparentPng = new Uint8Array(await sharp({ create: { width: 64, height: 64, channels: 4, background: { r: 0, g: 0, b: 0, alpha: 0 } } }).png().toBuffer());
  const params = new URLSearchParams({ angle: 'front', rightsSource: 'Own studio', rightsBasis: 'Photographed by Project Drive', watermarkFreeConfirmed: 'true' });
  const uploaded = await fetch(`${base}/api/admin/wheels/${variantId}/reference?${params}`, {
    method: 'POST', headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'image/png' }, body: transparentPng,
  });
  assert.equal(uploaded.status, 201);
  assert.equal((await json(`/api/admin/wheels/${variantId}`, { method: 'PATCH', token, body: { visible: true } })).response.status, 409);
  const threeQuarterParams = new URLSearchParams({ angle: 'three_quarter', rightsSource: 'Own studio', rightsBasis: 'Photographed by Project Drive', watermarkFreeConfirmed: 'true' });
  const threeQuarter = await fetch(`${base}/api/admin/wheels/${variantId}/reference?${threeQuarterParams}`, {
    method: 'POST', headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'image/png' }, body: transparentPng,
  });
  assert.equal(threeQuarter.status, 201);
  assert.equal((await json(`/api/admin/wheels/${variantId}`, { method: 'PATCH', token, body: { visible: true } })).response.status, 200);

  const overview = await json('/api/admin/overview', { token });
  assert.equal(overview.response.status, 200);
  assert.ok(overview.data.wheels.some((wheel) => wheel.id === variantId && wheel.visible === 1));
  assert.ok(overview.data.wheelCatalogSources.some((source) => source.slug === 'shiny-diski' && source.usage_status === 'permission_required'));

  // Даже администратор не может случайно импортировать данные магазина, пока
  // источник не предоставил письменное разрешение и не получил approved.
  const blockedFeed = await json('/api/admin/wheels/feed', {
    method: 'POST', token, body: { sourceSlug: 'shiny-diski', rows: [{
      id: 'shop-1', brand: 'Mak', model: 'Rapp', diameter: 19,
    }] },
  });
  assert.equal(blockedFeed.response.status, 409);
  assert.match(blockedFeed.data.error, /не разрешён/);

  console.log('✅ Админка требует права и два reference; магазин без разрешения заблокирован для импорта.');
} finally {
  await new Promise((resolve, reject) => server.close((error) => error ? reject(error) : resolve()));
}
