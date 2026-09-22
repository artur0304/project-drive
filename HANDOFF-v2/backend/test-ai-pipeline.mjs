process.env.PROJECT_DRIVE_DB_PATH = ':memory:';
process.env.PROJECT_DRIVE_AI_MODE = 'mock';
process.env.FAL_KEY = 'test-only-never-real';

import assert from 'node:assert/strict';
import { mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import sharp from 'sharp';
import { SpendGuard } from './spend-guard.mjs';
import { createFalProvider, FAL_MODEL } from './fal-provider.mjs';
import { buildPrompt, FIDELITY_CLAUSE_V1, PROMPT_VERSION } from './prompt-builder.mjs';

const db = await import('./db.mjs');
const { generateForProject, PRICE } = await import('./generation.mjs');
const catalog = db.getCustomizationCatalog();
assert.ok(catalog.wrapOptions.length >= 40 && catalog.wrapOptions.length <= 60);
assert.equal(catalog.tintLevels.length, 6);
assert.equal(catalog.tintZones.length, 4);
assert.equal(catalog.wheelColors.length, 8);
assert.match(buildPrompt([{ promptFragment: 'Change only the paint.' }]), new RegExp(FIDELITY_CLAUSE_V1.slice(0, 30)));
assert.equal(PROMPT_VERSION, 'catalog-v1-fidelity-v1');

const user = db.createUser({ email: 'pipeline@example.com' });
db.addCredits({ userId: user.id, amount: 100, reason: 'test' });
const project = db.createProject({ userId: user.id, name: 'Cache car' });
db.addSourceAsset({ projectId: project.id, url: '/uploads/cache.jpg', contentSha256: 'same-photo-hash' });
let providerCalls = 0;
const operation = { kind: 'wrap', optionId: catalog.wrapOptions[0].id };
const provider = async ({ sourceImage, prompt }) => {
  providerCalls += 1;
  assert.match(prompt, /Keep the exact same car/);
  return { ok: true, outputImage: `${sourceImage}.edited`, costUsd: 0 };
};
const first = await generateForProject({ db, userId: user.id, projectId: project.id, operations: [operation], provider });
const second = await generateForProject({ db, userId: user.id, projectId: project.id, operations: [operation], provider });
assert.equal(first.ok, true);
assert.equal(second.cached, true);
assert.equal(second.versionId, first.versionId);
assert.equal(second.creditsCharged, 0);
assert.equal(providerCalls, 1);
assert.equal(db.getWallet(user.id).balance, 100 - PRICE.wrap);

const temp = mkdtempSync(join(tmpdir(), 'project-drive-guard-'));
try {
  const guard = new SpendGuard({ ledgerPath: join(temp, 'ledger.json'), lifetimeBudgetUsd: 0.16, dailyBudgetUsd: 0.08 });
  const reservation = guard.reserve(0.08);
  guard.settle(reservation, 0.08);
  assert.throws(() => guard.reserve(0.08), /daily_budget_exceeded/);

  const source = await sharp({ create: { width: 32, height: 32, channels: 3, background: '#000000' } }).jpeg().toBuffer();
  const output = await sharp({ create: { width: 32, height: 32, channels: 3, background: '#ffffff' } }).png().toBuffer();
  const sourceName = `${crypto.randomUUID()}.jpg`;
  writeFileSync(join(dirname(fileURLToPath(import.meta.url)), 'uploads', sourceName), source);
  const calls = [];
  const fakeFal = {
    config() {},
    storage: { async upload(file) { calls.push(['upload', file.name]); return `https://fal.test/${file.name}`; } },
    async subscribe(model, request) { calls.push(['subscribe', model, request.input]); return { data: { images: [{ url: 'https://fal.test/output.png' }] } }; },
  };
  const liveGuard = new SpendGuard({ ledgerPath: join(temp, 'live-ledger.json'), lifetimeBudgetUsd: 1, dailyBudgetUsd: 1 });
  const falProvider = createFalProvider({ falClient: fakeFal, guard: liveGuard, fetchImpl: async () => new Response(output, { status: 200 }) });
  const generated = await falProvider({ sourceImage: `/uploads/${sourceName}`, prompt: 'Edit safely.' });
  assert.equal(generated.ok, true);
  assert.equal(calls[1][1], FAL_MODEL);
  assert.deepEqual(calls[1][2].image_urls, [`https://fal.test/${sourceName}`]);
  assert.equal(calls[1][2].aspect_ratio, 'auto');
  assert.equal(calls[1][2].resolution, '1K');
} finally {
  rmSync(temp, { recursive: true, force: true });
}

console.log('✅ Каталоги, серверный prompt, кэш, лимиты и fal-адаптер проверены без сетевых и платных вызовов.');
