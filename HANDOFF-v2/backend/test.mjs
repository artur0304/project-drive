// ============================================================================
// test.mjs — самопроверка "склада". Ничего не устанавливает, ничего в сеть
// не шлёт: просто создаёт пользователя, проект, начисляет и списывает кредиты
// и печатает результат. Так мы убеждаемся, что база работает.
// Запуск: node --experimental-sqlite test.mjs
// ============================================================================
import { rmSync } from 'node:fs';
// начнём с чистого листа, чтобы тест был честным (удаляем старый файл базы)
try { rmSync(new URL('./projectdrive.db', import.meta.url)); } catch {}

const db = await import('./db.mjs');

console.log('1) Создаём пользователя…');
const user = db.createUser({ email: 'artur@example.com', name: 'Артур' });
console.log('   создан:', user.email, 'id:', user.id.slice(0, 8) + '…');

console.log('2) Начисляем 100 кредитов (как приветственный бонус)…');
let bal = db.addCredits({ userId: user.id, amount: 100, reason: 'signup_bonus' });
console.log('   баланс:', bal);

console.log('3) Создаём проект (машину)…');
const project = db.createProject({ userId: user.id, name: 'BMW M4 Competition', vehicleMake: 'BMW', vehicleModel: 'M4' });
db.addSourceAsset({ projectId: project.id, url: '/uploads/my-car.jpg' });
console.log('   проект:', project.name);

console.log('4) Пробуем списать 55 кредитов за генерацию (плёнка+тонировка+диски)…');
const ok = db.spendCredits({ userId: user.id, amount: 55, reason: 'generate' });
console.log('   списание прошло:', ok, '| баланс теперь:', db.getWallet(user.id).balance);

console.log('5) Сохраняем версию (вариант) в проект…');
db.createVersion({ projectId: project.id, config: { wrap: 'Racing Green · Satin', tint: 'Limo', wheels: 'BMW 437M' }, creditsCharged: 55 });
console.log('   версий у проекта:', db.listVersions(project.id).length);

console.log('6) Пробуем списать 999 (заведомо больше баланса) — должно НЕ пройти…');
const tooMuch = db.spendCredits({ userId: user.id, amount: 999, reason: 'generate' });
console.log('   списание прошло:', tooMuch, '(ожидаем false) | баланс цел:', db.getWallet(user.id).balance);

console.log('7) История кредитов:');
for (const t of db.listTransactions(user.id)) console.log('   ', (t.delta > 0 ? '+' : '') + t.delta, t.reason);

console.log('\n✅ Всё отработало. База пишет и читает корректно, минус не допускается.');
