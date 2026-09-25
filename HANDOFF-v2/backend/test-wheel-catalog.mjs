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

// Licensed Commons designs are real named wheels, and unknown fitment sizes
// stay out of the diameter filter instead of being guessed.
const aez = db.listWheels({ search: 'Valencia D' }).items[0];
assert.equal(aez.brand, 'AEZ');
assert.equal(aez.image_url, '/wheel-catalog/commons/aez-valencia-d.webp');
assert.ok(!db.listWheelFacets().diameters.includes(0));
const resolvedAez = db.resolveCatalogOperations([{ kind: 'wheel_replace', variantId: aez.id }])[0];
assert.equal(resolvedAez.referenceImage, aez.image_url);

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
  hasAlpha: true, angle: 'front', rightsSource: 'Own studio', rightsBasis: 'Owned photo', watermarkFreeConfirmed: true, actorUserId: user.id,
});
assert.throws(() => db.setWheelVisibility({ variantId: created.id, visible: true, actorUserId: user.id }), /¾ reference/);
db.addWheelReferenceImage({
  variantId: created.id, url: '/wheel-uploads/test-3q.png', mimeType: 'image/png', width: 512, height: 512,
  hasAlpha: true, angle: 'three_quarter', rightsSource: 'Own studio', rightsBasis: 'Owned photo', watermarkFreeConfirmed: true, actorUserId: user.id,
});
assert.equal(db.setWheelVisibility({ variantId: created.id, visible: true, actorUserId: user.id }).visible, true);
assert.ok(db.listAuditLog().some((entry) => entry.action === 'wheel.publish'));

const beforeImport = db.listAdminWheels().length;
const duplicateEntry = {
  brand: 'Batch Brand', brandSlug: 'batch-brand', model: 'Batch One', modelSlug: 'batch-one', actorUserId: user.id,
  variant: { sizeLabel: 'R19', diameter: 19, color: 'Black', finish: 'Gloss', rightsSource: 'Own', rightsBasis: 'Owned' },
};
assert.throws(() => db.importWheelCatalogEntries([duplicateEntry, duplicateEntry]));
assert.equal(db.listAdminWheels().length, beforeImport);

console.log('✅ Каталог листается курсором; персональные списки, атомарный импорт и publish-guard двух ракурсов работают.');
