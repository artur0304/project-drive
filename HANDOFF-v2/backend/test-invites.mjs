// Проверка инвайт-кодов: начисление, защита от двойной активации, лимит
// использований и лист ожидания. Только in-memory база, без сети и денег.
process.env.PROJECT_DRIVE_DB_PATH = ':memory:';

import assert from 'node:assert/strict';
const db = await import('./db.mjs');

const admin = db.createUser({ email: 'admin@example.com', name: 'Admin' });

// --- создание кода и обычная активация ---
const code = db.createInviteCode({ code: 'beta-5', credits: 5, maxUses: 2, note: 'чат', createdBy: admin.id });
assert.equal(code.code, 'BETA-5', 'код приводится к верхнему регистру');
assert.equal(code.credits, 5);

const alice = db.createUser({ email: 'alice@example.com' });
const before = db.getWallet(alice.id).balance;
const r1 = db.redeemInviteCode({ userId: alice.id, code: 'beta-5' });
assert.equal(r1.ok, true);
assert.equal(r1.credits, 5);
assert.equal(db.getWallet(alice.id).balance, before + 5, 'кредиты начислены');

// --- тот же пользователь не активирует код дважды ---
const r2 = db.redeemInviteCode({ userId: alice.id, code: 'BETA-5' });
assert.equal(r2.ok, false);
assert.equal(r2.reason, 'already_redeemed');
assert.equal(db.getWallet(alice.id).balance, before + 5, 'повторная активация ничего не начисляет');

// --- второй пользователь активирует (осталось 1 использование) ---
const bob = db.createUser({ email: 'bob@example.com' });
assert.equal(db.redeemInviteCode({ userId: bob.id, code: 'BETA-5' }).ok, true);

// --- код исчерпан (max_uses = 2) ---
const carol = db.createUser({ email: 'carol@example.com' });
const r3 = db.redeemInviteCode({ userId: carol.id, code: 'BETA-5' });
assert.equal(r3.ok, false);
assert.equal(r3.reason, 'exhausted');
assert.equal(db.getWallet(carol.id).balance, 0, 'исчерпанный код ничего не начисляет');

// --- неизвестный и выключенный код ---
assert.equal(db.redeemInviteCode({ userId: carol.id, code: 'NOPE' }).reason, 'not_found');
db.createInviteCode({ code: 'OFF-1', credits: 3, maxUses: 5 });
db.setInviteActive({ code: 'OFF-1', active: false });
assert.equal(db.redeemInviteCode({ userId: carol.id, code: 'OFF-1' }).reason, 'not_found');

// --- валидация при создании ---
assert.throws(() => db.createInviteCode({ code: 'ab', credits: 5 }), /код/);
assert.throws(() => db.createInviteCode({ code: 'GOOD-1', credits: 0 }), /кредиты/);
assert.throws(() => db.createInviteCode({ code: 'BETA-5', credits: 5 }), /уже существует/);

// --- лист ожидания ---
const w1 = db.addWaitlistEmail({ email: 'Fan@Example.com ' });
assert.equal(w1.email, 'fan@example.com');
assert.equal(w1.duplicate, false);
assert.equal(db.addWaitlistEmail({ email: 'fan@example.com' }).duplicate, true, 'повтор не создаёт вторую запись');
assert.throws(() => db.addWaitlistEmail({ email: 'not-an-email' }), /email/);
db.markWaitlistInvited({ email: 'fan@example.com', code: 'BETA-XYZ' });
const listed = db.listWaitlist().find((row) => row.email === 'fan@example.com');
assert.equal(listed.status, 'invited');
assert.equal(listed.invited_code, 'BETA-XYZ');

console.log('✅ Инвайт-коды: начисление, защита от повтора, лимит использований и лист ожидания.');
