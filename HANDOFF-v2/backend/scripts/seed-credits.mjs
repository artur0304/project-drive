// Локальный ручной помощник для демонстрационных кредитов.
// Он не доступен через браузер и не связан с Google или настоящими деньгами.
// Пример: node --experimental-sqlite scripts/seed-credits.mjs user@example.com 100

import * as db from '../db.mjs';

const [email, rawAmount] = process.argv.slice(2);
const amount = Number(rawAmount);

if (!email || !Number.isInteger(amount) || amount <= 0) {
  console.error('Использование: node --experimental-sqlite scripts/seed-credits.mjs <email> <целое количество>');
  process.exitCode = 1;
} else {
  const user = db.getUserByEmail(email.trim().toLowerCase());
  if (!user) {
    console.error(`Пользователь ${email} не найден.`);
    process.exitCode = 1;
  } else {
    const balance = db.addCredits({ userId: user.id, amount, reason: 'local_seed' });
    console.log(`Начислено ${amount} демонстрационных кредитов. Новый баланс: ${balance}.`);
  }
}
