process.env.PROJECT_DRIVE_DB_PATH = ':memory:';

import assert from 'node:assert/strict';
const db = await import('./db.mjs');

const firstPage = db.listWheels({ limit: 3 });
assert.equal(firstPage.items.length, 3);
assert.ok(firstPage.nextCursor);
const secondPage = db.listWheels({ limit: 3, cursor: firstPage.nextCursor });
assert.equal(secondPage.items.length, 3);
assert.equal(new Set([...firstPage.items, ...secondPage.items].map((wheel) => wheel.id)).size, 6);

assert.ok(db.listWheels({ search: 'Vossen' }).items.every((wheel) => wheel.brand === 'Vossen'));
assert.ok(db.listWheels({ kind: 'oem' }).items.every((wheel) => wheel.is_oem === 1));
assert.ok(db.listWheels({ diameter: 22 }).items.every((wheel) => wheel.diameter === 22));

const user = db.createUser({ email: 'wheel-owner@example.com' });
const wheelId = firstPage.items[0].id;
assert.deepEqual(db.toggleFavoriteWheel({ userId: user.id, variantId: wheelId }), { favorite: true });
assert.equal(db.listFavoriteWheels(user.id)[0].id, wheelId);
assert.equal(db.recordRecentlyViewedWheel({ userId: user.id, variantId: wheelId }), true);
assert.equal(db.listRecentWheels(user.id)[0].id, wheelId);

const created = db.createWheelCatalogEntry({
  brand: 'Test Brand', brandSlug: 'test-brand', model: 'Legal One', modelSlug: 'legal-one', actorUserId: user.id,
  variant: { sizeLabel: 'R20', diameter: 20, color: 'Silver', finish: 'Satin', rightsSource: 'Own studio', rightsBasis: 'Owned photo' },
});
assert.throws(() => db.setWheelVisibility({ variantId: created.id, visible: true, actorUserId: user.id }), /reference/);
db.addWheelReferenceImage({
  variantId: created.id, url: '/wheel-uploads/test.png', mimeType: 'image/png', width: 512, height: 512,
  hasAlpha: true, angle: 'front', rightsSource: 'Own studio', rightsBasis: 'Owned photo', actorUserId: user.id,
});
assert.equal(db.setWheelVisibility({ variantId: created.id, visible: true, actorUserId: user.id }).visible, true);
assert.ok(db.listAuditLog().some((entry) => entry.action === 'wheel.publish'));

console.log('✅ Каталог фильтруется и листается курсором; избранное, recent и юридический publish-guard работают.');
