// Проверка самой важной денежной цепочки генерации. Используется только
// in-memory SQLite и mock-провайдер: сеть, Google и реальные деньги не затрагиваются.
process.env.PROJECT_DRIVE_DB_PATH = ':memory:';

import assert from 'node:assert/strict';

const db = await import('./db.mjs');
const { PRICE, costOf, generateForProject } = await import('./generation.mjs');

const user = db.createUser({ email: 'generation-test@example.com', name: 'Test' });
const project = db.createProject({ userId: user.id, name: 'Test car' });
db.addSourceAsset({ projectId: project.id, url: '/uploads/test.jpg' });

assert.equal(costOf([{ kind: 'wrap' }, { kind: 'tint' }]), PRICE.wrap + PRICE.tint);
assert.throws(() => costOf([{ kind: 'unknown' }]), /неизвестная операция/);

const insufficient = await generateForProject({
  db, userId: user.id, projectId: project.id, operations: [{ kind: 'wrap' }],
});
assert.equal(insufficient.code, 402);
assert.equal(db.getWallet(user.id).balance, 0);

db.addCredits({ userId: user.id, amount: 100, reason: 'test_seed' });
const beforeFailure = db.getWallet(user.id).balance;
const failed = await generateForProject({
  db, userId: user.id, projectId: project.id,
  operations: [{ kind: 'wheel_replace' }], forceFail: true,
});
assert.equal(failed.code, 502);
assert.equal(db.getWallet(user.id).balance, beforeFailure, 'кредиты должны вернуться после сбоя');
assert.equal(db.listVersions(project.id).length, 0, 'неудачная генерация не создаёт версию');

const succeeded = await generateForProject({
  db, userId: user.id, projectId: project.id,
  operations: [{ kind: 'wrap', color: 'Green', finish: 'Satin' }],
});
assert.equal(succeeded.ok, true);
assert.equal(succeeded.creditsCharged, PRICE.wrap);
assert.equal(db.getWallet(user.id).balance, beforeFailure - PRICE.wrap);
assert.equal(db.listVersions(project.id).length, 1);

console.log('✅ Цена, отказ при нехватке, возврат и успешное списание проверены.');
