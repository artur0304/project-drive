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
assert.deepEqual(precisePlan.map((step) => step.id), ['combined']);
assert.equal(precisePlan[0].credits, 1);

const user = db.createUser({ email: 'planner@example.com' });
db.addCredits({ userId: user.id, amount: 100, reason: 'test_seed' });
const project = db.createProject({ userId: user.id, name: 'Planner car' });
db.addSourceAsset({ projectId: project.id, url: '/uploads/source.jpg' });

let calls = 0;
const combined = await generateForProject({
  db, userId: user.id, projectId: project.id,
  operations: [
    { kind: 'wrap', color: 'Green', finish: 'Satin' },
    { kind: 'wheel_replace', name: 'BBS CH-R' },
  ],
  provider: async ({ sourceImage, operations }) => {
    calls += 1;
    assert.equal(operations.length, 2);
    return { ok: true, outputImage: `${sourceImage}.combined` };
  },
});
assert.equal(calls, 1);
assert.equal(combined.ok, true);
assert.equal(combined.partial, undefined);
assert.equal(combined.creditsCharged, 1);
assert.equal(db.getWallet(user.id).balance, 100 - 1);
const saved = db.getVersion(combined.versionId);
assert.equal(JSON.parse(saved.config_json).length, 2);
assert.equal(saved.status, 'complete');
assert.equal(saved.credits_charged, 1);
assert.equal(saved.planned_credits, 1);

console.log('✅ Planner объединяет плёнку и reference-диски в один AI-проход за один кредит.');
