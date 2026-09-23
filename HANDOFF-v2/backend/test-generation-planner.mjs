process.env.PROJECT_DRIVE_DB_PATH = ':memory:';

import assert from 'node:assert/strict';
const db = await import('./db.mjs');
const { generateForProject } = await import('./generation.mjs');
const { planGeneration } = await import('./generation-planner.mjs');

const appearancePlan = planGeneration([
  { kind: 'wrap', color: 'Green', finish: 'Satin' },
  { kind: 'tint', name: 'Medium', level: '35' },
  { kind: 'wheel_recolor', name: 'Black', color: '#111' },
]);
assert.equal(appearancePlan.length, 1);
assert.equal(appearancePlan[0].id, 'combined');
assert.equal(appearancePlan[0].credits, 1, 'один проход = 1 кредит');

const precisePlan = planGeneration([
  { kind: 'wrap', color: 'Green', finish: 'Satin' },
  { kind: 'wheel_replace', name: 'BBS CH-R' },
]);
assert.deepEqual(precisePlan.map((step) => step.id), ['appearance', 'wheel_precision']);
assert.equal(precisePlan[0].credits, 1);
assert.equal(precisePlan[1].credits, 1);

const user = db.createUser({ email: 'planner@example.com' });
db.addCredits({ userId: user.id, amount: 100, reason: 'test_seed' });
const project = db.createProject({ userId: user.id, name: 'Planner car' });
db.addSourceAsset({ projectId: project.id, url: '/uploads/source.jpg' });

let calls = 0;
const partial = await generateForProject({
  db, userId: user.id, projectId: project.id,
  operations: [
    { kind: 'wrap', color: 'Green', finish: 'Satin' },
    { kind: 'wheel_replace', name: 'BBS CH-R' },
  ],
  provider: async ({ sourceImage }) => {
    calls += 1;
    return calls === 1 ? { ok: true, outputImage: `${sourceImage}.appearance` } : { ok: false, error: 'precision_failed' };
  },
});
assert.equal(calls, 2);
assert.equal(partial.ok, true);
assert.equal(partial.partial, true);
assert.equal(partial.creditsCharged, 1);
assert.equal(partial.refundedCredits, 1);
assert.equal(db.getWallet(user.id).balance, 100 - 1);
const saved = db.getVersion(partial.versionId);
assert.deepEqual(JSON.parse(saved.config_json), [{ kind: 'wrap', color: 'Green', finish: 'Satin' }]);
assert.equal(saved.status, 'partial');
assert.equal(saved.credits_charged, 1);
assert.equal(saved.planned_credits, 2);
assert.match(saved.warning, /кредиты/);

console.log('✅ Planner объединяет простые правки, отделяет reference-диски и возвращает кредиты за упавший шаг.');
