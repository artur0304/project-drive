// Проверка самой важной денежной цепочки генерации. Используется только
// in-memory SQLite и mock-провайдер: сеть, Google и реальные деньги не затрагиваются.
process.env.PROJECT_DRIVE_DB_PATH = ':memory:';

import assert from 'node:assert/strict';

const db = await import('./db.mjs');
const { costOf, generateForProject, validateOperations } = await import('./generation.mjs');

const user = db.createUser({ email: 'generation-test@example.com', name: 'Test' });
const project = db.createProject({ userId: user.id, name: 'Test car' });
db.addSourceAsset({ projectId: project.id, url: '/uploads/test.jpg' });

// Новая модель: 1 кредит = 1 проход AI, не зависит от числа простых правок.
assert.equal(costOf([{ kind: 'wrap' }, { kind: 'tint' }]), 1, 'две простые правки = 1 кредит');
assert.equal(costOf([{ kind: 'wrap' }, { kind: 'tint' }, { kind: 'wheel_recolor' }]), 1, 'три простые правки = 1 кредит');
assert.equal(costOf([{ kind: 'wheel_replace' }]), 1, 'только замена дисков = 1 кредит');
assert.equal(costOf([{ kind: 'wrap' }, { kind: 'tint' }, { kind: 'wheel_replace' }]), 2, 'простые + замена дисков = 2 кредита (2 прохода)');
assert.throws(() => costOf([{ kind: 'unknown' }]), /неизвестная операция/);
assert.equal(validateOperations([{ kind: 'wrap', color: 'Green', finish: 'Satin' }]).ok, true);

const balanceBeforeInvalid = db.getWallet(user.id).balance;
for (const operations of [
  [{ kind: 'unknown' }],
  [{ kind: 'toString' }],
  [{ kind: 'wrap', color: 'Green', finish: 'Satin' }, { kind: 'wrap', color: 'Blue', finish: 'Gloss' }],
  [{ kind: 'tint', name: 'Medium' }],
]) {
  const invalid = await generateForProject({ db, userId: user.id, projectId: project.id, operations });
  assert.equal(invalid.code, 400);
}
assert.equal(db.getWallet(user.id).balance, balanceBeforeInvalid, 'неверный запрос не должен списывать кредиты');

const emptyProject = db.createProject({ userId: user.id, name: 'No photo' });
const noPhoto = await generateForProject({
  db, userId: user.id, projectId: emptyProject.id,
  operations: [{ kind: 'wrap', color: 'Green', finish: 'Satin' }],
});
assert.equal(noPhoto.code, 409);
assert.equal(db.getWallet(user.id).balance, balanceBeforeInvalid, 'без фото кредиты не списываются');

const insufficient = await generateForProject({
  db, userId: user.id, projectId: project.id,
  operations: [{ kind: 'wrap', color: 'Green', finish: 'Satin' }],
});
assert.equal(insufficient.code, 402);
assert.equal(db.getWallet(user.id).balance, 0);

db.addCredits({ userId: user.id, amount: 100, reason: 'test_seed' });
const beforeFailure = db.getWallet(user.id).balance;
const failed = await generateForProject({
  db, userId: user.id, projectId: project.id,
  operations: [{ kind: 'wheel_replace', name: 'Test wheel' }], forceFail: true,
});
assert.equal(failed.code, 502);
assert.equal(db.getWallet(user.id).balance, beforeFailure, 'кредиты должны вернуться после сбоя');
assert.equal(db.listVersions(project.id).length, 0, 'неудачная генерация не создаёт версию');

const providerCrash = await generateForProject({
  db, userId: user.id, projectId: project.id,
  operations: [{ kind: 'wrap', color: 'Green', finish: 'Satin' }],
  provider: async () => { throw new Error('provider offline'); },
});
assert.equal(providerCrash.code, 502);
assert.equal(db.getWallet(user.id).balance, beforeFailure, 'после исключения провайдера нужен возврат');

const providerTimeout = await generateForProject({
  db, userId: user.id, projectId: project.id,
  operations: [{ kind: 'wrap', color: 'Green', finish: 'Satin' }],
  provider: async () => ({ ok: false, error: 'fal_timeout', costUsd: 0.08, provider: 'fal' }),
});
assert.equal(providerTimeout.code, 502);
assert.equal(db.getWallet(user.id).balance, beforeFailure, 'после таймаута fal кредит должен вернуться');

const saveCrash = await generateForProject({
  db: { ...db, createVersion: () => { throw new Error('disk full'); } },
  userId: user.id, projectId: project.id,
  operations: [{ kind: 'wrap', color: 'Green', finish: 'Satin' }],
  provider: async ({ sourceImage }) => ({ ok: true, outputImage: sourceImage, costUsd: 0 }),
});
assert.equal(saveCrash.code, 500);
assert.equal(db.getWallet(user.id).balance, beforeFailure, 'при ошибке сохранения нужен возврат');
assert.equal(db.listVersions(project.id).length, 0);

const succeeded = await generateForProject({
  db, userId: user.id, projectId: project.id,
  operations: [{ kind: 'wrap', color: 'Green', finish: 'Satin' }],
});
assert.equal(succeeded.ok, true);
assert.equal(succeeded.creditsCharged, 1, 'одна плёнка = 1 кредит');
assert.equal(db.getWallet(user.id).balance, beforeFailure - 1);
assert.equal(db.listVersions(project.id).length, 1);

console.log('✅ Цена, отказ при нехватке, возврат и успешное списание проверены.');
