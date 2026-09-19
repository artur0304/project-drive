// ============================================================================
// db.mjs — слой доступа к базе данных ("общение со складом").
// ----------------------------------------------------------------------------
// Здесь мы открываем базу и пишем ПОНЯТНЫЕ функции: создать пользователя,
// создать проект, начислить/списать кредиты и т.д. Весь остальной код (сервер)
// вызывает эти функции и НЕ пишет SQL напрямую — так проще и безопаснее.
//
// БЕЗ установки чего-либо: используем встроенную в Node базу node:sqlite.
// Запуск (если Node ругается): node --experimental-sqlite <файл>.
//
// ДЛЯ CODEX: чтобы перейти на PostgreSQL в проде — замени тело этих функций
// на запросы к Postgres, оставив их НАЗВАНИЯ и то, что они возвращают, теми же.
// Тогда остальной код менять не придётся.
// ============================================================================

import { DatabaseSync } from 'node:sqlite';
import { randomUUID } from 'node:crypto';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const __dir = dirname(fileURLToPath(import.meta.url));

// Открываем файл базы (создастся сам, если его нет). Это и есть наш "склад".
const db = new DatabaseSync(join(__dir, 'projectdrive.db'));

// Включаем контроль связей между таблицами (чтобы нельзя было создать
// проект без существующего пользователя и т.п.).
db.exec('PRAGMA foreign_keys = ON;');

// Применяем структуру таблиц из schema.sql (создаст их, если ещё нет).
db.exec(readFileSync(join(__dir, 'schema.sql'), 'utf-8'));

// Маленький помощник: текущая дата-время строкой (ISO), напр. "2026-01-15T12:00:00Z".
const now = () => new Date().toISOString();

// ---------------------------------------------------------------------------
// ПОЛЬЗОВАТЕЛИ
// ---------------------------------------------------------------------------

// Создать пользователя. Заодно сразу заводим ему кошелёк с 0 кредитов.
export function createUser({ email, name = null }) {
  const id = randomUUID();
  db.prepare('INSERT INTO users (id, email, name, created_at) VALUES (?, ?, ?, ?)')
    .run(id, email, name, now());
  // у каждого пользователя должен быть кошелёк — создаём пустой
  db.prepare('INSERT INTO credit_wallets (user_id, balance) VALUES (?, 0)').run(id);
  return getUser(id);
}

export function getUser(id) {
  return db.prepare('SELECT * FROM users WHERE id = ?').get(id) ?? null;
}

export function getUserByEmail(email) {
  return db.prepare('SELECT * FROM users WHERE email = ?').get(email) ?? null;
}

export function listUsers() {
  return db.prepare('SELECT * FROM users ORDER BY created_at DESC').all();
}

// ---------------------------------------------------------------------------
// ПРОЕКТЫ (машины) и их файлы/версии
// ---------------------------------------------------------------------------

export function createProject({ userId, name, vehicleMake = null, vehicleModel = null }) {
  const id = randomUUID();
  db.prepare(`INSERT INTO car_projects (id, user_id, name, vehicle_make, vehicle_model, created_at)
              VALUES (?, ?, ?, ?, ?, ?)`)
    .run(id, userId, name, vehicleMake, vehicleModel, now());
  return getProject(id);
}

export function getProject(id) {
  return db.prepare('SELECT * FROM car_projects WHERE id = ?').get(id) ?? null;
}

export function updateProjectName({ projectId, userId, name }) {
  // user_id в условии не позволяет переименовать чужую машину даже при знании id.
  const result = db.prepare('UPDATE car_projects SET name = ? WHERE id = ? AND user_id = ?')
    .run(name, projectId, userId);
  return result.changes ? getProject(projectId) : null;
}

export function listProjects(userId) {
  return db.prepare('SELECT * FROM car_projects WHERE user_id = ? ORDER BY created_at DESC').all(userId);
}

// Список для Garage: к каждому проекту сразу добавляем исходное фото,
// количество сохранённых версий и последнюю картинку результата. Это убирает
// необходимость делать отдельный запрос для каждой карточки на странице.
export function listProjectsWithSummary(userId) {
  return db.prepare(`
    SELECT
      p.*,
      (SELECT a.url
         FROM source_assets a
        WHERE a.project_id = p.id
        ORDER BY a.created_at DESC
        LIMIT 1) AS source_url,
      (SELECT COUNT(*)
         FROM project_versions v
        WHERE v.project_id = p.id) AS version_count,
      (SELECT v.output_url
         FROM project_versions v
        WHERE v.project_id = p.id
        ORDER BY v.created_at DESC
        LIMIT 1) AS latest_output_url,
      (SELECT v.id
         FROM project_versions v
        WHERE v.project_id = p.id
        ORDER BY v.created_at DESC
        LIMIT 1) AS latest_version_id
    FROM car_projects p
    WHERE p.user_id = ?
    ORDER BY p.created_at DESC
  `).all(userId);
}

// Записать загруженное фото машины к проекту.
export function addSourceAsset({ projectId, url, type = 'photo' }) {
  const id = randomUUID();
  db.prepare('INSERT INTO source_assets (id, project_id, type, url, created_at) VALUES (?, ?, ?, ?, ?)')
    .run(id, projectId, type, url, now());
  return id;
}

// Сохранить версию (вариант). config — объект с выбором (плёнка/тонировка/диски).
export function createVersion({ projectId, config, outputUrl = null, creditsCharged = 0 }) {
  const id = randomUUID();
  db.prepare(`INSERT INTO project_versions (id, project_id, config_json, output_url, credits_charged, created_at)
              VALUES (?, ?, ?, ?, ?, ?)`)
    .run(id, projectId, JSON.stringify(config), outputUrl, creditsCharged, now());
  return id;
}

export function listVersions(projectId) {
  return db.prepare('SELECT * FROM project_versions WHERE project_id = ? ORDER BY created_at DESC').all(projectId);
}

export function getVersion(id) {
  return db.prepare('SELECT * FROM project_versions WHERE id = ?').get(id) ?? null;
}

export function createResultReport({ versionId, userId, reason, note = null }) {
  const existing = db.prepare('SELECT * FROM result_reports WHERE version_id = ?').get(versionId);
  if (existing) return { ...existing, already: true };
  const id = randomUUID();
  db.prepare(`INSERT INTO result_reports (id, version_id, user_id, reason, note, status, created_at)
              VALUES (?, ?, ?, ?, ?, 'open', ?)`).run(id, versionId, userId, reason, note, now());
  return db.prepare('SELECT * FROM result_reports WHERE id = ?').get(id);
}

// Последнее загруженное фото проекта (исходник для генерации).
export function getLatestSourceAsset(projectId) {
  return db.prepare('SELECT * FROM source_assets WHERE project_id = ? ORDER BY created_at DESC LIMIT 1').get(projectId) ?? null;
}

// ---------------------------------------------------------------------------
// КРЕДИТЫ (кошелёк) — деньги пользователя внутри сервиса
// ---------------------------------------------------------------------------

export function getWallet(userId) {
  return db.prepare('SELECT * FROM credit_wallets WHERE user_id = ?').get(userId) ?? null;
}

// Начислить кредиты (напр. после покупки пакета). delta > 0.
export function addCredits({ userId, amount, reason }) {
  if (amount <= 0) throw new Error('amount должен быть > 0');
  db.exec('BEGIN');                 // начинаем "транзакцию": либо всё, либо ничего
  try {
    db.prepare('UPDATE credit_wallets SET balance = balance + ? WHERE user_id = ?').run(amount, userId);
    logTx(userId, amount, reason);
    db.exec('COMMIT');
  } catch (e) { db.exec('ROLLBACK'); throw e; }
  return getWallet(userId).balance;
}

// Списать кредиты (напр. за генерацию). Возвращает true если хватило, иначе false.
// Баланс НИКОГДА не уходит в минус — это главная защита бюджета.
export function spendCredits({ userId, amount, reason }) {
  if (amount <= 0) throw new Error('amount должен быть > 0');
  db.exec('BEGIN');
  try {
    const w = db.prepare('SELECT balance FROM credit_wallets WHERE user_id = ?').get(userId);
    if (!w || w.balance < amount) { db.exec('ROLLBACK'); return false; } // не хватает — ничего не трогаем
    db.prepare('UPDATE credit_wallets SET balance = balance - ? WHERE user_id = ?').run(amount, userId);
    logTx(userId, -amount, reason);
    db.exec('COMMIT');
    return true;
  } catch (e) { db.exec('ROLLBACK'); throw e; }
}

export function listTransactions(userId) {
  return db.prepare('SELECT * FROM credit_transactions WHERE user_id = ? ORDER BY created_at DESC').all(userId);
}

// внутренний помощник — записать строку в историю кредитов
function logTx(userId, delta, reason) {
  db.prepare('INSERT INTO credit_transactions (id, user_id, delta, reason, created_at) VALUES (?, ?, ?, ?, ?)')
    .run(randomUUID(), userId, delta, reason, now());
}

// ---------------------------------------------------------------------------
// ЗАКАЗЫ / ОПЛАТА (покупка пакетов кредитов)
// ---------------------------------------------------------------------------
// Таблица заказов: человек нажал "купить пакет" -> создаётся заказ (pending).
// Когда платёжка сообщит "оплата прошла" -> заказ становится paid и кредиты
// начисляются. status: pending (ждём оплату) | paid (оплачен) | failed.
db.exec(`
  CREATE TABLE IF NOT EXISTS orders (
    id           TEXT PRIMARY KEY,
    user_id      TEXT NOT NULL,
    pack_id      TEXT NOT NULL,
    credits      INTEGER NOT NULL,      -- сколько кредитов начислить после оплаты
    amount_cents INTEGER NOT NULL,      -- цена в центах (напр. 1200 = $12.00)
    status       TEXT NOT NULL DEFAULT 'pending',
    created_at   TEXT NOT NULL,
    paid_at      TEXT,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
  );
`);

export function createOrder({ userId, packId, credits, amountCents }) {
  const id = randomUUID();
  db.prepare(`INSERT INTO orders (id, user_id, pack_id, credits, amount_cents, status, created_at)
              VALUES (?, ?, ?, ?, ?, 'pending', ?)`)
    .run(id, userId, packId, credits, amountCents, now());
  return getOrder(id);
}

export function getOrder(id) {
  return db.prepare('SELECT * FROM orders WHERE id = ?').get(id) ?? null;
}

// Пометить заказ оплаченным И начислить кредиты — одной транзакцией.
// ВАЖНО: идемпотентно — если платёжка пришлёт "оплата прошла" ДВАЖДЫ,
// кредиты начислятся только один раз (проверяем status).
export function markOrderPaid(orderId) {
  db.exec('BEGIN');
  try {
    const o = db.prepare('SELECT * FROM orders WHERE id = ?').get(orderId);
    if (!o) { db.exec('ROLLBACK'); return { ok: false, reason: 'not_found' }; }
    if (o.status === 'paid') { db.exec('ROLLBACK'); return { ok: true, already: true }; } // уже начисляли
    db.prepare("UPDATE orders SET status='paid', paid_at=? WHERE id=?").run(now(), orderId);
    db.prepare('UPDATE credit_wallets SET balance = balance + ? WHERE user_id = ?').run(o.credits, o.user_id);
    logTx(o.user_id, o.credits, 'purchase:' + o.pack_id);
    db.exec('COMMIT');
    return { ok: true, credited: o.credits };
  } catch (e) { db.exec('ROLLBACK'); throw e; }
}

export default db;
