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
import { readFileSync, readdirSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join, resolve } from 'node:path';

const __dir = dirname(fileURLToPath(import.meta.url));

// Обычный запуск использует локальный файл. Тесты передают ':memory:', чтобы
// никогда не удалять и не менять рабочую базу пользователя.
const configuredPath = process.env.PROJECT_DRIVE_DB_PATH;
const databasePath = configuredPath === ':memory:'
  ? ':memory:'
  : configuredPath ? resolve(configuredPath) : join(__dir, 'projectdrive.db');
const db = new DatabaseSync(databasePath);

// Включаем контроль связей между таблицами (чтобы нельзя было создать
// проект без существующего пользователя и т.п.).
db.exec('PRAGMA foreign_keys = ON;');

// Применяем структуру таблиц из schema.sql (создаст их, если ещё нет).
db.exec(readFileSync(join(__dir, 'schema.sql'), 'utf-8'));

// Новые части схемы идут отдельными нумерованными миграциями. Это сохраняет
// историю изменений и позволит позже перенести те же шаги на PostgreSQL.
db.exec(`CREATE TABLE IF NOT EXISTS schema_migrations (
  name TEXT PRIMARY KEY,
  applied_at TEXT NOT NULL
)`);
for (const name of readdirSync(join(__dir, 'migrations')).filter((file) => file.endsWith('.sql')).sort()) {
  const applied = db.prepare('SELECT 1 FROM schema_migrations WHERE name = ?').get(name);
  if (applied) continue;
  db.exec('BEGIN');
  try {
    db.exec(readFileSync(join(__dir, 'migrations', name), 'utf-8'));
    db.prepare('INSERT INTO schema_migrations (name, applied_at) VALUES (?, ?)').run(name, new Date().toISOString());
    db.exec('COMMIT');
  } catch (error) {
    db.exec('ROLLBACK');
    throw error;
  }
}

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
  // Email регистронезависим: Artur@Example.com и artur@example.com — один аккаунт.
  return db.prepare('SELECT * FROM users WHERE email = ? COLLATE NOCASE').get(email) ?? null;
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
export function createVersion({ projectId, config, outputUrl = null, creditsCharged = 0, status = 'complete', warning = null, plannedCredits = creditsCharged }) {
  const id = randomUUID();
  db.prepare(`INSERT INTO project_versions
    (id, project_id, config_json, output_url, credits_charged, created_at, status, warning, planned_credits)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`)
    .run(id, projectId, JSON.stringify(config), outputUrl, creditsCharged, now(), status, warning, plannedCredits);
  return id;
}

export function listVersions(projectId) {
  return db.prepare('SELECT * FROM project_versions WHERE project_id = ? ORDER BY created_at DESC').all(projectId);
}

export function getVersion(id) {
  return db.prepare('SELECT * FROM project_versions WHERE id = ?').get(id) ?? null;
}

export function enablePublicShare(versionId) {
  const existing = db.prepare('SELECT * FROM public_result_shares WHERE version_id = ?').get(versionId);
  if (existing) {
    db.prepare('UPDATE public_result_shares SET enabled = 1, disabled_at = NULL WHERE id = ?').run(existing.id);
    return { token: existing.token, enabled: true };
  }
  const token = `${randomUUID().replaceAll('-', '')}${randomUUID().replaceAll('-', '')}`;
  db.prepare(`INSERT INTO public_result_shares (id, version_id, token, enabled, created_at)
    VALUES (?, ?, ?, 1, ?)`).run(randomUUID(), versionId, token, now());
  return { token, enabled: true };
}

export function disablePublicShare(versionId) {
  const result = db.prepare('UPDATE public_result_shares SET enabled = 0, disabled_at = ? WHERE version_id = ?').run(now(), versionId);
  return { enabled: false, changed: Boolean(result.changes) };
}

export function getPublicShare(token) {
  const row = db.prepare(`SELECT s.token, v.id AS version_id, v.config_json, v.output_url,
      v.status, v.warning, v.created_at, p.name AS project_name
    FROM public_result_shares s
    JOIN project_versions v ON v.id = s.version_id
    JOIN car_projects p ON p.id = v.project_id
    WHERE s.token = ? AND s.enabled = 1`).get(token);
  if (!row) return null;
  let operations = [];
  try { operations = JSON.parse(row.config_json || '[]'); } catch { /* Не раскрываем повреждённый JSON. */ }
  return {
    token: row.token, versionId: row.version_id, projectName: row.project_name,
    operations, outputUrl: row.output_url, generationStatus: row.status,
    warning: row.warning, createdAt: row.created_at,
  };
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

// ---------------------------------------------------------------------------
// КАТАЛОГ ДИСКОВ
// ---------------------------------------------------------------------------

function encodeWheelCursor(row) {
  return Buffer.from(`${row.popularity}:${row.id}`, 'utf8').toString('base64url');
}

function decodeWheelCursor(cursor) {
  if (!cursor) return null;
  try {
    const [popularity, id] = Buffer.from(cursor, 'base64url').toString('utf8').split(':');
    const parsed = Number(popularity);
    return Number.isFinite(parsed) && id ? { popularity: parsed, id } : null;
  } catch { return null; }
}

export function listWheels({ search = '', brand = '', kind = '', diameter = null, finish = '', color = '', cursor = '', limit = 24 }) {
  const safeLimit = Math.min(48, Math.max(1, Number(limit) || 24));
  const clauses = ['m.visible = 1', 'v.visible = 1', 'b.visible = 1', 'r.id IS NOT NULL'];
  const values = [];
  if (search) {
    clauses.push("(b.name LIKE ? ESCAPE '\\' OR m.name LIKE ? ESCAPE '\\')");
    const escaped = `%${String(search).replace(/[\\%_]/g, '\\$&')}%`;
    values.push(escaped, escaped);
  }
  if (brand) { clauses.push('b.slug = ?'); values.push(brand); }
  if (kind === 'oem') clauses.push('b.is_oem = 1');
  if (kind === 'aftermarket') clauses.push('b.is_oem = 0');
  if (Number.isFinite(Number(diameter)) && Number(diameter) > 0) { clauses.push('v.diameter = ?'); values.push(Number(diameter)); }
  if (finish) { clauses.push('v.finish = ?'); values.push(finish); }
  if (color) { clauses.push('v.color = ?'); values.push(color); }
  const decoded = decodeWheelCursor(cursor);
  if (decoded) {
    clauses.push('(m.popularity < ? OR (m.popularity = ? AND v.id > ?))');
    values.push(decoded.popularity, decoded.popularity, decoded.id);
  }

  const rows = db.prepare(`
    SELECT v.id, b.name AS brand, b.slug AS brand_slug, b.is_oem,
           m.name AS model, m.supplier, m.price_cents, m.affiliate_link, m.popularity,
           v.size_label, v.diameter, v.color, v.finish, v.bolt_pattern, v.offset, v.center_bore,
           r.url AS image_url, r.angle AS image_angle
      FROM wheel_variants v
      JOIN wheel_models m ON m.id = v.model_id
      JOIN wheel_brands b ON b.id = m.brand_id
      LEFT JOIN wheel_reference_images r ON r.id = (
        SELECT ri.id FROM wheel_reference_images ri WHERE ri.variant_id = v.id ORDER BY ri.is_primary DESC, ri.created_at LIMIT 1
      )
     WHERE ${clauses.join(' AND ')}
     ORDER BY m.popularity DESC, v.id ASC
     LIMIT ?
  `).all(...values, safeLimit + 1);
  const items = rows.slice(0, safeLimit);
  return { items, nextCursor: rows.length > safeLimit ? encodeWheelCursor(items.at(-1)) : null };
}

export function listWheelFacets() {
  return {
    brands: db.prepare('SELECT slug, name, is_oem FROM wheel_brands WHERE visible = 1 ORDER BY name').all(),
    diameters: db.prepare('SELECT DISTINCT diameter FROM wheel_variants WHERE visible = 1 ORDER BY diameter').all().map((row) => row.diameter),
    finishes: db.prepare('SELECT DISTINCT finish FROM wheel_variants WHERE visible = 1 ORDER BY finish').all().map((row) => row.finish),
    colors: db.prepare('SELECT DISTINCT color FROM wheel_variants WHERE visible = 1 ORDER BY color').all().map((row) => row.color),
  };
}

export function toggleFavoriteWheel({ userId, variantId }) {
  if (!db.prepare('SELECT 1 FROM wheel_variants WHERE id = ? AND visible = 1').get(variantId)) return null;
  const existing = db.prepare('SELECT 1 FROM favorite_wheels WHERE user_id = ? AND variant_id = ?').get(userId, variantId);
  if (existing) db.prepare('DELETE FROM favorite_wheels WHERE user_id = ? AND variant_id = ?').run(userId, variantId);
  else db.prepare('INSERT INTO favorite_wheels (user_id, variant_id, created_at) VALUES (?, ?, ?)').run(userId, variantId, now());
  return { favorite: !existing };
}

const wheelSelect = `
  SELECT v.id, b.name AS brand, b.slug AS brand_slug, b.is_oem, m.name AS model,
         m.popularity, v.size_label, v.diameter, v.color, v.finish,
         r.url AS image_url
    FROM wheel_variants v JOIN wheel_models m ON m.id = v.model_id
    JOIN wheel_brands b ON b.id = m.brand_id
    LEFT JOIN wheel_reference_images r ON r.id = (
      SELECT ri.id FROM wheel_reference_images ri WHERE ri.variant_id = v.id ORDER BY ri.is_primary DESC, ri.created_at LIMIT 1
    )`;

export function listFavoriteWheels(userId, limit = 24) {
  return db.prepare(`${wheelSelect} JOIN favorite_wheels f ON f.variant_id = v.id
    WHERE f.user_id = ? AND v.visible = 1 ORDER BY f.created_at DESC LIMIT ?`).all(userId, Math.min(48, Math.max(1, Number(limit) || 24)));
}

export function recordRecentlyViewedWheel({ userId, variantId }) {
  if (!db.prepare('SELECT 1 FROM wheel_variants WHERE id = ? AND visible = 1').get(variantId)) return false;
  db.prepare(`INSERT INTO recently_viewed_wheels (user_id, variant_id, viewed_at) VALUES (?, ?, ?)
    ON CONFLICT(user_id, variant_id) DO UPDATE SET viewed_at = excluded.viewed_at`).run(userId, variantId, now());
  return true;
}

export function listRecentWheels(userId, limit = 12) {
  return db.prepare(`${wheelSelect} JOIN recently_viewed_wheels rv ON rv.variant_id = v.id
    WHERE rv.user_id = ? AND v.visible = 1 ORDER BY rv.viewed_at DESC LIMIT ?`).all(userId, Math.min(24, Math.max(1, Number(limit) || 12)));
}

export function listAdminWheels() {
  return db.prepare(`SELECT v.id, b.name AS brand, m.name AS model, v.size_label, v.color, v.finish,
    v.visible, m.image_rights_source, m.image_rights_basis,
    (SELECT COUNT(*) FROM wheel_reference_images r WHERE r.variant_id = v.id) AS reference_count
    FROM wheel_variants v JOIN wheel_models m ON m.id = v.model_id JOIN wheel_brands b ON b.id = m.brand_id
    ORDER BY m.created_at DESC, v.id`).all();
}

export function setWheelVisibility({ variantId, visible, actorUserId }) {
  if (visible) {
    const legal = db.prepare(`SELECT m.image_rights_source, m.image_rights_basis,
      (SELECT COUNT(*) FROM wheel_reference_images r WHERE r.variant_id = v.id AND r.angle = 'front') AS front_refs,
      (SELECT COUNT(*) FROM wheel_reference_images r WHERE r.variant_id = v.id AND r.angle = 'three_quarter') AS three_quarter_refs
      FROM wheel_variants v JOIN wheel_models m ON m.id = v.model_id WHERE v.id = ?`).get(variantId);
    if (!legal || !legal.image_rights_source || !legal.image_rights_basis || !legal.front_refs || !legal.three_quarter_refs) {
      const error = new Error('нельзя публиковать без front + ¾ reference и основания прав');
      error.statusCode = 409;
      throw error;
    }
  }
  const result = db.prepare('UPDATE wheel_variants SET visible = ? WHERE id = ?').run(visible ? 1 : 0, variantId);
  if (!result.changes) return null;
  writeAuditLog({ actorUserId, action: visible ? 'wheel.publish' : 'wheel.hide', entityType: 'wheel_variant', entityId: variantId });
  return { id: variantId, visible: Boolean(visible) };
}

function insertWheelCatalogEntry({ brand, brandSlug, isOem = false, model, modelSlug, variant, actorUserId }) {
  const brandId = randomUUID();
  const modelId = randomUUID();
  const variantId = randomUUID();
  const existingBrand = db.prepare('SELECT id FROM wheel_brands WHERE slug = ?').get(brandSlug);
  const selectedBrandId = existingBrand?.id || brandId;
  if (!existingBrand) {
    db.prepare(`INSERT INTO wheel_brands (id, slug, name, is_oem, visible, created_at) VALUES (?, ?, ?, ?, 1, ?)`)
      .run(brandId, brandSlug, brand, isOem ? 1 : 0, now());
  }
  const existingModel = db.prepare('SELECT id FROM wheel_models WHERE brand_id = ? AND slug = ?').get(selectedBrandId, modelSlug);
  const selectedModelId = existingModel?.id || modelId;
  if (!existingModel) {
    db.prepare(`INSERT INTO wheel_models
      (id, brand_id, slug, name, supplier, price_cents, affiliate_link, popularity,
       image_rights_source, image_rights_basis, visible, created_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 1, ?)`)
      .run(modelId, selectedBrandId, modelSlug, model, variant.supplier || null,
        variant.priceCents ?? null, variant.affiliateLink || null, variant.popularity || 0,
        variant.rightsSource, variant.rightsBasis, now());
  }
  db.prepare(`INSERT INTO wheel_variants
    (id, model_id, size_label, diameter, color, finish, bolt_pattern, offset, center_bore, visible, created_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 0, ?)`)
    .run(variantId, selectedModelId, variant.sizeLabel, variant.diameter, variant.color, variant.finish,
      variant.boltPattern || null, variant.offset ?? null, variant.centerBore ?? null, now());
  writeAuditLog({ actorUserId, action: 'wheel.create', entityType: 'wheel_variant', entityId: variantId });
  return { id: variantId, visible: false };
}

export function createWheelCatalogEntry(entry) {
  db.exec('BEGIN');
  try {
    const result = insertWheelCatalogEntry(entry);
    db.exec('COMMIT');
    return result;
  } catch (error) { db.exec('ROLLBACK'); throw error; }
}

export function importWheelCatalogEntries(entries) {
  db.exec('BEGIN');
  try {
    const results = entries.map(insertWheelCatalogEntry);
    db.exec('COMMIT');
    return results;
  } catch (error) {
    db.exec('ROLLBACK');
    throw error;
  }
}

export function addWheelReferenceImage({ variantId, url, mimeType, width, height, hasAlpha, angle, rightsSource, rightsBasis, actorUserId }) {
  const variant = db.prepare('SELECT id FROM wheel_variants WHERE id = ?').get(variantId);
  if (!variant) return null;
  const id = randomUUID();
  db.prepare(`INSERT INTO wheel_reference_images
    (id, variant_id, angle, url, mime_type, width, height, has_alpha, is_primary, rights_source, rights_basis, created_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`)
    .run(id, variantId, angle, url, mimeType, width, height, hasAlpha ? 1 : 0,
      angle === 'front' ? 1 : 0, rightsSource, rightsBasis, now());
  writeAuditLog({ actorUserId, action: 'wheel.reference_upload', entityType: 'wheel_variant', entityId: variantId, details: { angle, width, height } });
  return { id, url };
}

export function adjustCreditsByAdmin({ userId, delta, reason, actorUserId }) {
  if (!Number.isInteger(delta) || delta === 0) throw new Error('изменение должно быть целым ненулевым числом');
  const target = getWallet(userId);
  if (!target || target.balance + delta < 0) throw new Error('кошелёк не найден или баланс станет отрицательным');
  db.exec('BEGIN');
  try {
    db.prepare('UPDATE credit_wallets SET balance = balance + ? WHERE user_id = ?').run(delta, userId);
    logTx(userId, delta, `admin:${reason}`);
    writeAuditLog({ actorUserId, action: 'credits.adjust', entityType: 'user', entityId: userId, details: { delta, reason } });
    db.exec('COMMIT');
    return getWallet(userId);
  } catch (error) { db.exec('ROLLBACK'); throw error; }
}

export function listAiJobs(limit = 50) {
  return db.prepare('SELECT * FROM ai_jobs ORDER BY created_at DESC LIMIT ?').all(Math.min(100, Math.max(1, Number(limit) || 50)));
}

export function writeAuditLog({ actorUserId, action, entityType, entityId = null, details = null }) {
  db.prepare(`INSERT INTO admin_audit_log (id, actor_user_id, action, entity_type, entity_id, details_json, created_at)
    VALUES (?, ?, ?, ?, ?, ?, ?)`).run(randomUUID(), actorUserId, action, entityType, entityId, details ? JSON.stringify(details) : null, now());
}

export function listAuditLog(limit = 50) {
  return db.prepare('SELECT * FROM admin_audit_log ORDER BY created_at DESC LIMIT ?').all(Math.min(100, Math.max(1, Number(limit) || 50)));
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
  CREATE INDEX IF NOT EXISTS idx_orders_user_status
    ON orders(user_id, status, created_at DESC);
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
