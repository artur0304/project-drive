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
import { normalizeAuthorizedFeed } from './wheel-feed.mjs';

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

export function getDatabaseReadiness() {
  const quickCheck = db.prepare('PRAGMA quick_check').get();
  const foreignKeys = db.prepare('PRAGMA foreign_keys').get();
  const migrations = db.prepare('SELECT COUNT(*) AS count FROM schema_migrations').get();
  const integrity = Object.values(quickCheck || {})[0] || 'unknown';
  const foreignKeysEnabled = Number(Object.values(foreignKeys || {})[0]) === 1;
  return {
    ready: integrity === 'ok' && foreignKeysEnabled,
    integrity,
    foreignKeysEnabled,
    migrationCount: Number(migrations?.count || 0),
  };
}

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
        WHERE a.project_id = p.id AND a.type = 'photo'
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
export function addSourceAsset({ projectId, url, type = 'photo', contentSha256 = null }) {
  const id = randomUUID();
  db.prepare('INSERT INTO source_assets (id, project_id, type, url, created_at, content_sha256) VALUES (?, ?, ?, ?, ?, ?)')
    .run(id, projectId, type, url, now(), contentSha256);
  return id;
}

// Сохранить версию (вариант). config — объект с выбором (плёнка/тонировка/диски).
export function createVersion({ projectId, config, outputUrl = null, creditsCharged = 0, status = 'complete', warning = null, plannedCredits = creditsCharged, cacheKey = null, promptVersion = null, pricingVersion = null, internalCostUsd = 0 }) {
  const id = randomUUID();
  db.prepare(`INSERT INTO project_versions
    (id, project_id, config_json, output_url, credits_charged, created_at, status, warning, planned_credits,
     cache_key, prompt_version, pricing_version, internal_cost_usd)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`)
    .run(id, projectId, JSON.stringify(config), outputUrl, creditsCharged, now(), status, warning, plannedCredits,
      cacheKey, promptVersion, pricingVersion, internalCostUsd);
  return id;
}

export function getCachedVersion({ projectId, cacheKey }) {
  return db.prepare(`SELECT * FROM project_versions
    WHERE project_id = ? AND cache_key = ? AND status = 'complete' ORDER BY created_at DESC LIMIT 1`)
    .get(projectId, cacheKey) ?? null;
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
  return db.prepare("SELECT * FROM source_assets WHERE project_id = ? AND type = 'photo' ORDER BY created_at DESC LIMIT 1").get(projectId) ?? null;
}

// ---------------------------------------------------------------------------
// SERVER-OWNED CUSTOMIZATION CATALOGS
// ---------------------------------------------------------------------------

export function getCustomizationCatalog() {
  return {
    tintLevels: db.prepare(`SELECT id, code, display_name, vlt_percent, preview_swatch, sort_order
      FROM tint_levels WHERE is_active = 1 ORDER BY sort_order`).all(),
    tintZones: db.prepare(`SELECT id, code, display_name, sort_order
      FROM tint_zones WHERE is_active = 1 ORDER BY sort_order`).all(),
    wrapFinishes: db.prepare(`SELECT id, code, display_name, sort_order
      FROM wrap_finishes WHERE is_active = 1 ORDER BY sort_order`).all(),
    wrapColors: db.prepare(`SELECT id, code, display_name, hex, family, sort_order
      FROM wrap_colors WHERE is_active = 1 ORDER BY sort_order`).all(),
    wrapOptions: db.prepare(`SELECT o.id, o.display_name, o.preview_swatch, o.preview_asset, o.sort_order,
        c.id AS color_id, c.code AS color_code, c.display_name AS color_name, c.hex, c.family,
        f.id AS finish_id, f.code AS finish_code, f.display_name AS finish_name
      FROM wrap_options o JOIN wrap_colors c ON c.id = o.color_id JOIN wrap_finishes f ON f.id = o.finish_id
      WHERE o.is_active = 1 AND c.is_active = 1 AND f.is_active = 1 ORDER BY o.sort_order`).all(),
    wheelColors: db.prepare(`SELECT id, code, display_name, preview_swatch, preview_asset, finish_code, sort_order
      FROM wheel_color_options WHERE is_active = 1 ORDER BY sort_order`).all(),
  };
}

export function resolveCatalogOperations(operations, { projectId = null } = {}) {
  return operations.map((operation) => {
    if (operation.kind === 'wrap' && operation.optionId) {
      const row = db.prepare(`SELECT o.id, o.display_name, o.preview_swatch, o.prompt_fragment,
          c.display_name AS color, c.hex, f.display_name AS finish
        FROM wrap_options o JOIN wrap_colors c ON c.id=o.color_id JOIN wrap_finishes f ON f.id=o.finish_id
        WHERE o.id=? AND o.is_active=1 AND c.is_active=1 AND f.is_active=1`).get(operation.optionId);
      if (!row) throw Object.assign(new Error('опция плёнки не найдена'), { statusCode: 400 });
      return { kind: 'wrap', optionId: row.id, color: row.color, hex: row.hex, finish: row.finish, promptFragment: row.prompt_fragment };
    }
    if (operation.kind === 'tint' && operation.levelId && operation.zoneId) {
      const level = db.prepare('SELECT * FROM tint_levels WHERE id=? AND is_active=1').get(operation.levelId);
      const zone = db.prepare('SELECT * FROM tint_zones WHERE id=? AND is_active=1').get(operation.zoneId);
      if (!level || !zone) throw Object.assign(new Error('опция тонировки не найдена'), { statusCode: 400 });
      return { kind: 'tint', levelId: level.id, zoneId: zone.id, name: level.display_name, level: String(level.vlt_percent), zone: zone.display_name, promptFragment: `${level.prompt_fragment} ${zone.prompt_fragment}` };
    }
    if (operation.kind === 'wheel_recolor' && operation.optionId) {
      const row = db.prepare('SELECT * FROM wheel_color_options WHERE id=? AND is_active=1').get(operation.optionId);
      if (!row) throw Object.assign(new Error('цвет дисков не найден'), { statusCode: 400 });
      return { kind: 'wheel_recolor', optionId: row.id, name: row.display_name, color: row.preview_swatch, finish: row.finish_code, promptFragment: row.prompt_fragment };
    }
    if (operation.kind === 'wheel_replace' && operation.variantId) {
      const row = db.prepare(`SELECT v.id, v.size_label, v.color, v.finish, v.spoke_style,
          b.name AS brand, m.name AS model, m.prompt_fragment,
          r.id AS reference_id, r.url AS reference_url, r.fal_url, r.watermark_free_confirmed
        FROM wheel_variants v JOIN wheel_models m ON m.id=v.model_id JOIN wheel_brands b ON b.id=m.brand_id
        LEFT JOIN wheel_reference_images r ON r.id=(SELECT id FROM wheel_reference_images
          WHERE variant_id=v.id
          ORDER BY CASE angle WHEN 'three_quarter' THEN 0 ELSE 1 END, is_primary DESC, created_at
          LIMIT 1)
        WHERE v.id=? AND v.visible=1 AND m.visible=1 AND b.visible=1`).get(operation.variantId);
      if (!row || !row.reference_url || !row.watermark_free_confirmed) throw Object.assign(new Error('диск или подтверждённый reference не найден'), { statusCode: 400 });
      return {
        kind: 'wheel_replace', variantId: row.id, name: `${row.brand} ${row.model}`, color: row.color,
        referenceImage: row.reference_url,
        reference: { id: row.reference_id, fal_url: row.fal_url },
        promptFragment: `Replace the wheels on the car in the first image with the exact wheel design shown in the second image. Match the reference wheel's spokes, style and finish as closely as possible. ${row.prompt_fragment || ''}`.trim(),
      };
    }
    if (operation.kind === 'wheel_replace' && operation.referenceAssetId) {
      const row = db.prepare("SELECT id, url FROM source_assets WHERE id = ? AND project_id = ? AND type = 'wheel_reference'")
        .get(operation.referenceAssetId, projectId);
      if (!row) throw Object.assign(new Error('референс диска не найден в этом проекте'), { statusCode: 400 });
      return {
        kind: 'wheel_replace', referenceAssetId: row.id, name: operation.name || 'Custom wheel reference',
        referenceImage: row.url,
        promptFragment: `Replace the wheels on the car in the first image with the exact wheel design shown in the second image. Reproduce its spoke count, spoke shape, concavity, center cap, rim lip, color and finish. Apply the same design to every visible wheel while preserving correct perspective, tire size and brake geometry.`,
      };
    }
    // Legacy saved drafts remain usable in mock mode. Live requests are checked
    // in generation.mjs and must use catalog ids.
    return { ...operation, promptFragment: operation.promptFragment || legacyPrompt(operation) };
  });
}

function legacyPrompt(operation) {
  if (operation.kind === 'wrap') return `Change only the car body color to ${operation.color} with a ${operation.finish} professional automotive wrap.`;
  if (operation.kind === 'tint') return `Apply approximately ${operation.level}% VLT professional automotive tint to the side and rear windows. Keep the windshield unchanged.`;
  if (operation.kind === 'wheel_recolor') return `Recolor only the existing wheels ${operation.name}.`;
  return `Replace only the wheels with ${operation.name}.`;
}

export function cacheWheelReferenceFalUrl({ referenceId, falUrl }) {
  db.prepare('UPDATE wheel_reference_images SET fal_url=?, fal_uploaded_at=? WHERE id=?').run(falUrl, now(), referenceId);
}

export function consumeGenerationAttempt({ userId, ipHash, limit = 6 }) {
  const since = new Date(Date.now() - 60 * 60 * 1000).toISOString();
  const userCount = db.prepare('SELECT COUNT(*) AS count FROM generation_attempts WHERE user_id=? AND created_at>=?').get(userId, since).count;
  const ipCount = db.prepare('SELECT COUNT(*) AS count FROM generation_attempts WHERE ip_hash=? AND created_at>=?').get(ipHash, since).count;
  if (userCount >= limit || ipCount >= limit) return false;
  db.prepare('INSERT INTO generation_attempts (id,user_id,ip_hash,created_at) VALUES (?,?,?,?)').run(randomUUID(), userId, ipHash, now());
  db.prepare('DELETE FROM generation_attempts WHERE created_at < ?').run(new Date(Date.now() - 48 * 60 * 60 * 1000).toISOString());
  return true;
}

export function recordAiJob({ userId, projectId, provider, latencyMs, costUsd, attempts = 1, error = null, creditsCharged = 0 }) {
  db.prepare(`INSERT INTO ai_jobs (id,user_id,project_id,provider,latency_ms,cost_usd,attempts,error,credits_charged,created_at)
    VALUES (?,?,?,?,?,?,?,?,?,?)`).run(randomUUID(), userId, projectId, provider, latencyMs, costUsd, attempts, error, creditsCharged, now());
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

// Atomically reserve the user's credits and persist a pending generation.
// There is no crash window between these two actions: SQLite commits both or
// neither. Startup recovery can therefore refund every abandoned reservation.
export function beginGenerationJob({ userId, projectId, credits }) {
  if (!Number.isInteger(credits) || credits <= 0) throw new Error('credits должен быть положительным целым числом');
  const id = randomUUID();
  const timestamp = now();
  db.exec('BEGIN');
  try {
    const wallet = db.prepare('SELECT balance FROM credit_wallets WHERE user_id = ?').get(userId);
    if (!wallet || wallet.balance < credits) {
      db.exec('ROLLBACK');
      return { ok: false };
    }
    db.prepare('UPDATE credit_wallets SET balance = balance - ? WHERE user_id = ?').run(credits, userId);
    logTx(userId, -credits, `generate:${id}`);
    db.prepare(`INSERT INTO generation_jobs
      (id,user_id,project_id,credits_reserved,status,created_at,updated_at)
      VALUES (?,?,?,?, 'pending', ?,?)`).run(id, userId, projectId, credits, timestamp, timestamp);
    db.exec('COMMIT');
    return { ok: true, jobId: id };
  } catch (error) {
    db.exec('ROLLBACK');
    throw error;
  }
}

export function finishGenerationJob({ jobId, status, error = null, versionId = null }) {
  if (!['done', 'failed'].includes(status)) throw new Error('неверный статус generation job');
  const changed = db.prepare(`UPDATE generation_jobs
    SET status=?, error=?, version_id=?, updated_at=? WHERE id=? AND status='pending'`)
    .run(status, error, versionId, now(), jobId).changes;
  return changed === 1;
}

export function getGenerationJob(jobId) {
  return db.prepare('SELECT * FROM generation_jobs WHERE id = ?').get(jobId) ?? null;
}

// Refund only stale pending rows and mark them failed in the same transaction.
// Re-running this function is safe: completed/recovered rows are never selected.
export function recoverInterruptedGenerationJobs({ olderThanMinutes = 10 } = {}) {
  const minutes = Number.isFinite(Number(olderThanMinutes)) ? Number(olderThanMinutes) : 10;
  const cutoff = new Date(Date.now() - minutes * 60 * 1000).toISOString();
  const recoveredAt = now();
  db.exec('BEGIN');
  try {
    const pending = db.prepare(`SELECT id,user_id,credits_reserved FROM generation_jobs
      WHERE status='pending' AND created_at <= ? ORDER BY created_at`).all(cutoff);
    for (const job of pending) {
      db.prepare('UPDATE credit_wallets SET balance = balance + ? WHERE user_id = ?')
        .run(job.credits_reserved, job.user_id);
      logTx(job.user_id, job.credits_reserved, `refund:interrupted:${job.id}`);
      db.prepare(`UPDATE generation_jobs SET status='failed', error='server_interrupted',
        updated_at=?, recovered_at=? WHERE id=? AND status='pending'`)
        .run(recoveredAt, recoveredAt, job.id);
    }
    db.exec('COMMIT');
    return pending.length;
  } catch (error) {
    db.exec('ROLLBACK');
    throw error;
  }
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

export function listWheels({ search = '', brand = '', kind = '', diameter = null, finish = '', color = '', style = '', cursor = '', limit = 24 }) {
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
  if (style) { clauses.push('v.spoke_style = ?'); values.push(style); }
  const decoded = decodeWheelCursor(cursor);
  if (decoded) {
    clauses.push('(m.popularity < ? OR (m.popularity = ? AND v.id > ?))');
    values.push(decoded.popularity, decoded.popularity, decoded.id);
  }

  const rows = db.prepare(`
    SELECT v.id, b.name AS brand, b.slug AS brand_slug, b.is_oem,
           m.name AS model, m.supplier, m.price_cents, m.affiliate_link, m.popularity,
           m.source_url, m.image_rights_source, m.image_rights_basis,
           v.size_label, v.diameter, v.color, v.finish, v.spoke_style,
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
    // A zero diameter means the licensed photograph identifies the design but
    // not a sellable fitment. Keep it searchable without inventing a size.
    diameters: db.prepare('SELECT DISTINCT diameter FROM wheel_variants WHERE visible = 1 AND diameter > 0 ORDER BY diameter').all().map((row) => row.diameter),
    finishes: db.prepare('SELECT DISTINCT finish FROM wheel_variants WHERE visible = 1 ORDER BY finish').all().map((row) => row.finish),
    colors: db.prepare('SELECT DISTINCT color FROM wheel_variants WHERE visible = 1 ORDER BY color').all().map((row) => row.color),
    styles: db.prepare('SELECT DISTINCT spoke_style FROM wheel_variants WHERE visible = 1 AND spoke_style IS NOT NULL ORDER BY spoke_style').all().map((row) => row.spoke_style),
  };
}

export function listWheelCatalogSources() {
  return db.prepare(`SELECT id, slug, name, base_url, terms_url, usage_status,
      rights_basis, contact_email, notes, created_at, updated_at
    FROM wheel_catalog_sources ORDER BY name`).all();
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
         m.popularity, m.source_url, m.image_rights_source, m.image_rights_basis,
         v.size_label, v.diameter, v.color, v.finish, v.spoke_style,
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
      (SELECT COUNT(*) FROM wheel_reference_images r WHERE r.variant_id = v.id AND r.angle = 'three_quarter') AS three_quarter_refs,
      (SELECT COUNT(*) FROM wheel_reference_images r WHERE r.variant_id = v.id AND r.watermark_free_confirmed = 0) AS unconfirmed_refs
      FROM wheel_variants v JOIN wheel_models m ON m.id = v.model_id WHERE v.id = ?`).get(variantId);
    if (!legal || !legal.image_rights_source || !legal.image_rights_basis || !legal.front_refs || !legal.three_quarter_refs || legal.unconfirmed_refs) {
      const error = new Error('нельзя публиковать без front + ¾ reference, основания прав и подтверждения отсутствия водяного знака');
      error.statusCode = 409;
      throw error;
    }
  }
  const result = db.prepare('UPDATE wheel_variants SET visible = ? WHERE id = ?').run(visible ? 1 : 0, variantId);
  if (!result.changes) return null;
  writeAuditLog({ actorUserId, action: visible ? 'wheel.publish' : 'wheel.hide', entityType: 'wheel_variant', entityId: variantId });
  return { id: variantId, visible: Boolean(visible) };
}

function insertWheelCatalogEntry({ brand, brandSlug, isOem = false, model, modelSlug, variant, source = null, actorUserId }) {
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
       image_rights_source, image_rights_basis, visible, created_at,
       source_id, external_id, source_url, category, wheel_type, country_of_origin)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 1, ?, ?, ?, ?, ?, ?, ?)`)
      .run(modelId, selectedBrandId, modelSlug, model, variant.supplier || null,
        variant.priceCents ?? null, variant.affiliateLink || null, variant.popularity || 0,
        variant.rightsSource, variant.rightsBasis, now(),
        source?.id || null, source?.externalId || null, source?.sourceUrl || null,
        source?.category || null, source?.wheelType || null, source?.country || null);
  }
  db.prepare(`INSERT INTO wheel_variants
    (id, model_id, size_label, diameter, color, finish, bolt_pattern, offset, center_bore, visible, created_at,
     width, sku, stock_status, source_price_cents, source_currency)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 0, ?, ?, ?, ?, ?, ?)`)
    .run(variantId, selectedModelId, variant.sizeLabel, variant.diameter, variant.color, variant.finish,
      variant.boltPattern || null, variant.offset ?? null, variant.centerBore ?? null, now(),
      variant.width ?? null, variant.sku || null, variant.stockStatus || null,
      variant.priceCents ?? null, variant.currency || null);
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

// Массовая синхронизация официального фида. Источник проверяется ещё раз на
// уровне БД, поэтому ошибочная кнопка или отдельный скрипт не смогут импортировать
// каталог со статусом permission_required. Новые позиции остаются скрытыми до
// загрузки двух разрешённых reference-изображений.
export function importAuthorizedWheelFeedEntries({ sourceSlug, rows, actorUserId }) {
  const sourceRow = db.prepare('SELECT * FROM wheel_catalog_sources WHERE slug = ?').get(sourceSlug);
  if (!sourceRow) throw Object.assign(new Error('источник каталога не зарегистрирован'), { statusCode: 404 });
  if (sourceRow.usage_status !== 'approved' || !sourceRow.rights_basis) {
    throw Object.assign(new Error(`источник ${sourceRow.name} не разрешён: нужно письменное основание прав`), { statusCode: 409 });
  }
  const entries = normalizeAuthorizedFeed(rows, {
    id: sourceRow.id,
    name: sourceRow.name,
    usageStatus: sourceRow.usage_status,
    rightsBasis: sourceRow.rights_basis,
  });

  let created = 0;
  let updated = 0;
  db.exec('BEGIN');
  try {
    for (const entry of entries) {
      let brand = db.prepare('SELECT id FROM wheel_brands WHERE slug = ?').get(entry.brandSlug);
      if (!brand) {
        const id = randomUUID();
        db.prepare(`INSERT INTO wheel_brands (id, slug, name, is_oem, visible, created_at)
          VALUES (?, ?, ?, ?, 1, ?)`).run(id, entry.brandSlug, entry.brand, entry.isOem ? 1 : 0, now());
        brand = { id };
      }

      let model = db.prepare('SELECT id FROM wheel_models WHERE source_id = ? AND external_id = ?')
        .get(sourceRow.id, entry.source.externalId);
      if (!model) {
        const id = randomUUID();
        db.prepare(`INSERT INTO wheel_models
          (id, brand_id, slug, name, supplier, price_cents, affiliate_link, popularity,
           image_rights_source, image_rights_basis, visible, created_at,
           source_id, external_id, source_url, category, wheel_type, country_of_origin)
          VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 0, ?, ?, ?, ?, ?, ?, ?)`)
          .run(id, brand.id, entry.modelSlug, entry.model, entry.variant.supplier,
            entry.variant.priceCents, entry.variant.affiliateLink, entry.variant.popularity,
            entry.variant.rightsSource, entry.variant.rightsBasis, now(), sourceRow.id,
            entry.source.externalId, entry.source.sourceUrl, entry.source.category,
            entry.source.wheelType, entry.source.country);
        model = { id };
      } else {
        db.prepare(`UPDATE wheel_models SET brand_id=?, slug=?, name=?, supplier=?, price_cents=?,
          affiliate_link=?, popularity=?, image_rights_source=?, image_rights_basis=?, source_url=?,
          category=?, wheel_type=?, country_of_origin=? WHERE id=?`)
          .run(brand.id, entry.modelSlug, entry.model, entry.variant.supplier,
            entry.variant.priceCents, entry.variant.affiliateLink, entry.variant.popularity,
            entry.variant.rightsSource, entry.variant.rightsBasis, entry.source.sourceUrl,
            entry.source.category, entry.source.wheelType, entry.source.country, model.id);
      }

      const existing = db.prepare(`SELECT id FROM wheel_variants
        WHERE model_id=? AND size_label=? AND color=? AND finish=?`)
        .get(model.id, entry.variant.sizeLabel, entry.variant.color, entry.variant.finish);
      if (existing) {
        db.prepare(`UPDATE wheel_variants SET diameter=?, width=?, bolt_pattern=?, offset=?, center_bore=?,
          sku=?, stock_status=?, source_price_cents=?, source_currency=? WHERE id=?`)
          .run(entry.variant.diameter, entry.variant.width, entry.variant.boltPattern,
            entry.variant.offset, entry.variant.centerBore, entry.variant.sku,
            entry.variant.stockStatus, entry.variant.priceCents, entry.variant.currency, existing.id);
        updated += 1;
      } else {
        const variantId = randomUUID();
        db.prepare(`INSERT INTO wheel_variants
          (id, model_id, size_label, diameter, color, finish, bolt_pattern, offset, center_bore,
           visible, created_at, width, sku, stock_status, source_price_cents, source_currency)
          VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 0, ?, ?, ?, ?, ?, ?)`)
          .run(variantId, model.id, entry.variant.sizeLabel, entry.variant.diameter,
            entry.variant.color, entry.variant.finish, entry.variant.boltPattern,
            entry.variant.offset, entry.variant.centerBore, now(), entry.variant.width,
            entry.variant.sku, entry.variant.stockStatus, entry.variant.priceCents, entry.variant.currency);
        created += 1;
      }
    }
    writeAuditLog({ actorUserId, action: 'wheel.feed_sync', entityType: 'wheel_catalog_source',
      entityId: sourceRow.id, details: { rows: entries.length, created, updated } });
    db.exec('COMMIT');
    return { source: sourceRow.slug, received: entries.length, created, updated };
  } catch (error) {
    db.exec('ROLLBACK');
    throw error;
  }
}

export function addWheelReferenceImage({ variantId, url, mimeType, width, height, hasAlpha, angle, rightsSource, rightsBasis, watermarkFreeConfirmed = false, actorUserId }) {
  const variant = db.prepare('SELECT id FROM wheel_variants WHERE id = ?').get(variantId);
  if (!variant) return null;
  const id = randomUUID();
  db.prepare(`INSERT INTO wheel_reference_images
    (id, variant_id, angle, url, mime_type, width, height, has_alpha, is_primary, rights_source, rights_basis, created_at, watermark_free_confirmed)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`)
    .run(id, variantId, angle, url, mimeType, width, height, hasAlpha ? 1 : 0,
      angle === 'front' ? 1 : 0, rightsSource, rightsBasis, now(), watermarkFreeConfirmed ? 1 : 0);
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

export function recordProductEvent({ userId, eventName, projectId = null, versionId = null, details = null }) {
  const id = randomUUID();
  db.prepare(`INSERT INTO product_events
    (id, user_id, project_id, version_id, event_name, details_json, created_at)
    VALUES (?, ?, ?, ?, ?, ?, ?)`)
    .run(id, userId, projectId, versionId, eventName, details ? JSON.stringify(details) : null, now());
  return id;
}

export function getProductAnalytics({ days = 30, recentLimit = 30 } = {}) {
  const safeDays = Math.min(365, Math.max(1, Number(days) || 30));
  const safeLimit = Math.min(100, Math.max(1, Number(recentLimit) || 30));
  const since = new Date(Date.now() - safeDays * 24 * 60 * 60 * 1000).toISOString();
  const totals = db.prepare(`SELECT event_name, COUNT(*) AS count, MAX(created_at) AS last_at
    FROM product_events WHERE created_at >= ? GROUP BY event_name ORDER BY count DESC, event_name`).all(since);
  const recent = db.prepare(`SELECT event_name, project_id, version_id, details_json, created_at
    FROM product_events ORDER BY created_at DESC LIMIT ?`).all(safeLimit);
  const projectCounts = Object.fromEntries(db.prepare(`SELECT event_name, COUNT(DISTINCT project_id) AS count
    FROM product_events WHERE created_at >= ? AND project_id IS NOT NULL GROUP BY event_name`).all(since)
    .map((row) => [row.event_name, row.count]));
  const created = projectCounts.project_created || 0;
  const uploaded = projectCounts.photo_uploaded || 0;
  const generated = db.prepare(`SELECT COUNT(DISTINCT project_id) AS count FROM product_events
    WHERE created_at >= ? AND event_name IN ('mock_generation_succeeded', 'mock_generation_failed', 'generation_succeeded', 'generation_failed')`).get(since).count;
  const succeeded = (projectCounts.mock_generation_succeeded || 0) + (projectCounts.generation_succeeded || 0);
  const reported = projectCounts.result_reported || 0;
  const percent = (value, base) => base > 0 ? Math.round((value / base) * 100) : 0;
  const funnel = {
    created, uploaded, generated, succeeded, reported,
    uploadRate: percent(uploaded, created),
    generationRate: percent(generated, uploaded),
    successRate: percent(succeeded, generated),
    reportRate: percent(reported, succeeded),
  };
  return { days: safeDays, totals, recent, funnel };
}

export function exportUserData(userId) {
  const user = getUser(userId);
  if (!user) return null;
  const projects = listProjectsWithSummary(userId).map((project) => ({
    id: project.id,
    name: project.name,
    vehicleMake: project.vehicle_make,
    vehicleModel: project.vehicle_model,
    createdAt: project.created_at,
    sourceUrl: project.source_url,
    versions: listVersions(project.id).map((version) => {
      let operations = [];
      try { operations = JSON.parse(version.config_json || '[]'); } catch { /* Повреждённую конфигурацию не экспортируем. */ }
      return {
        id: version.id, operations, outputUrl: version.output_url,
        creditsCharged: version.credits_charged, plannedCredits: version.planned_credits,
        status: version.status, warning: version.warning, createdAt: version.created_at,
      };
    }),
  }));
  return {
    schemaVersion: 1,
    exportedAt: now(),
    account: { email: user.email, name: user.name, createdAt: user.created_at },
    wallet: getWallet(userId),
    creditTransactions: listTransactions(userId),
    projects,
    favoriteWheelIds: db.prepare('SELECT variant_id FROM favorite_wheels WHERE user_id = ? ORDER BY created_at DESC').all(userId).map((row) => row.variant_id),
    recentWheelIds: db.prepare('SELECT variant_id FROM recently_viewed_wheels WHERE user_id = ? ORDER BY viewed_at DESC').all(userId).map((row) => row.variant_id),
    reports: db.prepare('SELECT version_id, reason, note, status, created_at FROM result_reports WHERE user_id = ? ORDER BY created_at DESC').all(userId),
    publicShares: db.prepare(`SELECT s.version_id, s.enabled, s.created_at, s.disabled_at
      FROM public_result_shares s JOIN project_versions v ON v.id = s.version_id
      JOIN car_projects p ON p.id = v.project_id WHERE p.user_id = ? ORDER BY s.created_at DESC`).all(userId),
    orders: db.prepare('SELECT id, pack_id, credits, amount_cents, status, created_at, paid_at FROM orders WHERE user_id = ? ORDER BY created_at DESC').all(userId),
    productEvents: db.prepare('SELECT event_name, project_id, version_id, details_json, created_at FROM product_events WHERE user_id = ? ORDER BY created_at DESC').all(userId),
  };
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

// ===========================================================================
// ИНВАЙТ-КОДЫ И ЛИСТ ОЖИДАНИЯ (закрытая бета).
// Вместо оплаты Артур раздаёт коды на N генераций. Один код = max_uses активаций,
// один пользователь может активировать конкретный код только один раз.
// ===========================================================================

// Маленький помощник: бросить ошибку с HTTP-кодом, чтобы сервер отдал его клиенту.
function httpError(message, statusCode) {
  return Object.assign(new Error(message), { statusCode });
}

// Создать инвайт-код (только из админки).
export function createInviteCode({ code, credits, maxUses = 1, note = null, createdBy = null }) {
  const clean = String(code || '').trim().toUpperCase();
  if (!/^[A-Z0-9-]{4,32}$/.test(clean)) throw httpError('код: 4–32 символа A–Z, 0–9, дефис', 400);
  const c = Math.floor(Number(credits));
  if (!Number.isFinite(c) || c <= 0 || c > 1000) throw httpError('кредиты: от 1 до 1000', 400);
  const uses = Math.floor(Number(maxUses));
  if (!Number.isFinite(uses) || uses <= 0 || uses > 100000) throw httpError('использований: от 1 до 100000', 400);
  if (db.prepare('SELECT code FROM invite_codes WHERE code = ?').get(clean)) throw httpError('такой код уже существует', 409);
  db.prepare(`INSERT INTO invite_codes (code, credits, max_uses, used_count, note, active, created_by, created_at)
    VALUES (?, ?, ?, 0, ?, 1, ?, ?)`)
    .run(clean, c, uses, note ? String(note).slice(0, 200) : null, createdBy, now());
  return getInviteCode(clean);
}

export function getInviteCode(code) {
  return db.prepare('SELECT * FROM invite_codes WHERE code = ?').get(String(code || '').trim().toUpperCase()) ?? null;
}

export function listInviteCodes() {
  return db.prepare('SELECT * FROM invite_codes ORDER BY created_at DESC').all();
}

export function setInviteActive({ code, active }) {
  const clean = String(code || '').trim().toUpperCase();
  db.prepare('UPDATE invite_codes SET active = ? WHERE code = ?').run(active ? 1 : 0, clean);
  return getInviteCode(clean);
}

// Активировать код. ВСЁ в одной транзакции: проверка, отметка использования,
// защита от повторной активации тем же пользователем и НАЧИСЛЕНИЕ кредитов —
// либо целиком, либо ничего. Возвращает { ok, credits, balance } или { ok:false, reason }.
export function redeemInviteCode({ userId, code }) {
  const clean = String(code || '').trim().toUpperCase();
  if (!clean) return { ok: false, reason: 'empty' };
  db.exec('BEGIN');
  try {
    const invite = db.prepare('SELECT * FROM invite_codes WHERE code = ?').get(clean);
    if (!invite || !invite.active) { db.exec('ROLLBACK'); return { ok: false, reason: 'not_found' }; }
    if (invite.used_count >= invite.max_uses) { db.exec('ROLLBACK'); return { ok: false, reason: 'exhausted' }; }
    if (db.prepare('SELECT 1 FROM invite_redemptions WHERE code = ? AND user_id = ?').get(clean, userId)) {
      db.exec('ROLLBACK'); return { ok: false, reason: 'already_redeemed' };
    }
    db.prepare('UPDATE invite_codes SET used_count = used_count + 1 WHERE code = ?').run(clean);
    db.prepare('INSERT INTO invite_redemptions (code, user_id, redeemed_at, credits) VALUES (?, ?, ?, ?)')
      .run(clean, userId, now(), invite.credits);
    db.prepare('UPDATE credit_wallets SET balance = balance + ? WHERE user_id = ?').run(invite.credits, userId);
    logTx(userId, invite.credits, 'invite:' + clean);
    db.exec('COMMIT');
    return { ok: true, credits: invite.credits, balance: getWallet(userId).balance };
  } catch (e) { db.exec('ROLLBACK'); throw e; }
}

// --- Лист ожидания ---
export function addWaitlistEmail({ email, note = null }) {
  const clean = String(email || '').trim().toLowerCase();
  if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(clean) || clean.length > 200) throw httpError('нужен корректный email', 400);
  if (db.prepare('SELECT email FROM waitlist WHERE email = ?').get(clean)) return { email: clean, duplicate: true };
  db.prepare('INSERT INTO waitlist (email, status, note, created_at) VALUES (?, ?, ?, ?)')
    .run(clean, 'pending', note ? String(note).slice(0, 200) : null, now());
  return { email: clean, duplicate: false };
}

export function listWaitlist() {
  return db.prepare('SELECT * FROM waitlist ORDER BY created_at DESC').all();
}

export function markWaitlistInvited({ email, code }) {
  db.prepare("UPDATE waitlist SET status = 'invited', invited_code = ? WHERE email = ?")
    .run(code, String(email || '').trim().toLowerCase());
}
