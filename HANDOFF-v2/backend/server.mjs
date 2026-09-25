// ============================================================================
// server.mjs — маленький веб-сервер (API), через который сайт общается со "складом".
// ----------------------------------------------------------------------------
// БЕЗ установки чего-либо: используем встроенный в Node модуль http.
// Запуск:  node --experimental-sqlite server.mjs
// Откроется на http://localhost:3000
//
// Что умеет (с локальным входом и mock-генерацией, но без оплаты и реального AI):
//   GET  /api/health                     — проверка "сервер жив"
//   POST /api/auth/register              — создать локальный аккаунт
//   POST /api/auth/login                 — войти и получить токен
//   POST /api/projects                   — создать свой проект (машину)
//   GET  /api/projects                   — получить только свои проекты
//   GET  /api/wallet                     — получить только свой баланс
// Демонстрационные кредиты добавляются только ручным scripts/seed-credits.mjs;
// браузерного маршрута пополнения нет.
//
// ДЛЯ CODEX: это учебный сервер на голом http. В реальном проекте по плану —
// Next.js API routes. Логику (что делает каждый маршрут) можно перенести 1:1,
// вызовы к db.mjs останутся те же.
// ============================================================================

import { createServer } from 'node:http';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { createHash, randomUUID } from 'node:crypto';
import * as db from './db.mjs';
import * as auth from './auth.mjs';   // вход/регистрация
import { CREDITS_PER_PASS, PRICING_VERSION, generateForProject } from './generation.mjs';  // "мозг" генерации
import { normalizeUploadedImage, validateVehiclePhoto, VehiclePhotoValidationError } from './image-normalizer.mjs';
import { validateWheelReference } from './wheel-reference.mjs';
import { createRequestContext, writeErrorLog } from './observability.mjs';
import { createLocalObjectStorage } from './object-storage.mjs';

// папка, куда складываем загруженные фото (создаётся сама)
const backendRoot = dirname(fileURLToPath(import.meta.url));
const objectStorage = createLocalObjectStorage({ backendRoot, wheelCatalogRoot: join(backendRoot, '..', 'web', 'public', 'wheel-catalog') });
await objectStorage.ensureReady();

// Прочитать "сырое" тело (байты файла), но не больше maxBytes — иначе обрываем.
function readRaw(req, maxBytes) {
  return new Promise((resolve, reject) => {
    const chunks = []; let size = 0;
    req.on('data', (c) => {
      size += c.length;
      if (size > maxBytes) { reject(new Error('too big')); req.destroy(); }
      else chunks.push(c);
    });
    req.on('end', () => resolve(Buffer.concat(chunks)));
    req.on('error', reject);
  });
}

// Достать "пропуск" (токен) из заголовка запроса: "Authorization: Bearer <токен>"
function tokenFrom(req) {
  const h = req.headers['authorization'] || '';
  return h.startsWith('Bearer ') ? h.slice(7) : null;
}

function isAdmin(user) {
  if (!user) return false;
  const allowed = String(process.env.PROJECT_DRIVE_ADMIN_EMAILS || '')
    .split(',').map((email) => email.trim().toLowerCase()).filter(Boolean);
  return allowed.includes(String(user.email).toLowerCase());
}

function cleanSlug(value) {
  return String(value || '').trim().toLowerCase().replace(/[^a-z0-9-]+/g, '-').replace(/^-+|-+$/g, '').slice(0, 80);
}

function parseWheelEntry(input) {
  const brand = String(input?.brand || '').trim().slice(0, 80);
  const model = String(input?.model || '').trim().slice(0, 100);
  const sizeLabel = String(input?.sizeLabel || '').trim().slice(0, 20);
  const color = String(input?.color || '').trim().slice(0, 80);
  const finish = String(input?.finish || '').trim().slice(0, 80);
  const rightsSource = String(input?.rightsSource || '').trim().slice(0, 250);
  const rightsBasis = String(input?.rightsBasis || '').trim().slice(0, 250);
  const diameter = Number(input?.diameter);
  if (!brand || !model || !sizeLabel || !color || !finish || !rightsSource || !rightsBasis || !Number.isInteger(diameter) || diameter < 12 || diameter > 30) {
    const error = new Error('нужны brand, model, sizeLabel, diameter 12–30, color, finish и основание прав');
    error.statusCode = 400;
    throw error;
  }
  return {
    brand, brandSlug: cleanSlug(input.brandSlug || brand), isOem: input.isOem === true || ['1', 'true', 'yes'].includes(String(input.isOem || '').toLowerCase()),
    model, modelSlug: cleanSlug(input.modelSlug || model),
    variant: {
      sizeLabel, diameter, color, finish, rightsSource, rightsBasis,
      supplier: String(input.supplier || '').trim().slice(0, 120) || null,
      priceCents: input.priceCents == null || input.priceCents === '' ? null : Number(input.priceCents),
      affiliateLink: String(input.affiliateLink || '').trim().slice(0, 500) || null,
      popularity: Number(input.popularity) || 0,
      boltPattern: String(input.boltPattern || '').trim().slice(0, 40) || null,
      offset: input.offset == null || input.offset === '' ? null : Number(input.offset),
      centerBore: input.centerBore == null || input.centerBore === '' ? null : Number(input.centerBore),
    },
  };
}

const PORT = Number(process.env.PROJECT_DRIVE_PORT || 3000);
const HOST = '127.0.0.1';
const WEB_APP_URL = 'http://127.0.0.1:3001';
const MOCK_PAYMENTS_ENABLED = process.env.PROJECT_DRIVE_ENABLE_MOCK_PAYMENTS === '1';
const LOGIN_WINDOW_MS = 15 * 60 * 1000;
const LOGIN_MAX_FAILURES = 5;
const loginFailures = new Map();

// A hard process stop can leave a paid request without a response. Stale
// pending jobs are refunded on startup. This is transactional and idempotent.
const recoveredGenerationJobs = db.recoverInterruptedGenerationJobs({
  olderThanMinutes: Number(process.env.PROJECT_DRIVE_PENDING_JOB_RECOVERY_MINUTES || 10),
});
if (recoveredGenerationJobs > 0) console.log(`Возвращены кредиты за прерванные генерации: ${recoveredGenerationJobs}`);

function loginKey(req, email) {
  return `${req.socket.remoteAddress || 'unknown'}:${String(email || '').trim().toLowerCase()}`;
}

function loginBlock(key) {
  const entry = loginFailures.get(key);
  if (!entry) return null;
  if (Date.now() - entry.startedAt >= LOGIN_WINDOW_MS) {
    loginFailures.delete(key);
    return null;
  }
  return entry.count >= LOGIN_MAX_FAILURES ? entry : null;
}

function recordLoginFailure(key) {
  const current = loginFailures.get(key);
  if (!current || Date.now() - current.startedAt >= LOGIN_WINDOW_MS) {
    loginFailures.set(key, { count: 1, startedAt: Date.now() });
  } else {
    current.count += 1;
  }
  // Локальный сервер не должен бесконечно хранить попытки по выдуманным email.
  if (loginFailures.size > 10_000) loginFailures.clear();
}

// Пока настоящий платёжный провайдер не подключён, webhook разрешён только
// процессам на этом компьютере. Внешний запрос не сможет начислить кредиты.
function isLoopbackRequest(req) {
  const address = req.socket.remoteAddress || '';
  return address === '127.0.0.1' || address === '::1' || address === '::ffff:127.0.0.1';
}

// Помощник: прочитать небольшое JSON-тело. Фотографии проходят через отдельный
// readRaw с собственным лимитом. Здесь не даём обычному API заполнить память.
function readBody(req, maxBytes = 64 * 1024) {
  return new Promise((resolve, reject) => {
    const chunks = [];
    let size = 0;
    let tooLarge = false;

    req.on('data', (chunk) => {
      size += chunk.length;
      if (size > maxBytes) {
        tooLarge = true;
        return;
      }
      chunks.push(chunk);
    });
    req.on('end', () => {
      if (tooLarge) return reject(Object.assign(new Error('JSON-тело больше 64 КБ'), { statusCode: 413 }));
      if (!chunks.length) return resolve({});
      try {
        const parsed = JSON.parse(Buffer.concat(chunks).toString('utf8'));
        if (!parsed || Array.isArray(parsed) || typeof parsed !== 'object') throw new Error('not an object');
        return resolve(parsed);
      } catch {
        return reject(Object.assign(new Error('некорректный JSON'), { statusCode: 400 }));
      }
    });
    req.on('error', reject);
  });
}

// Помощник: отправить ответ в формате JSON.
function send(res, status, obj) {
  res.writeHead(status, {
    'Content-Type': 'application/json; charset=utf-8',
    'Cache-Control': 'no-store',
    'X-Content-Type-Options': 'nosniff',
    'Referrer-Policy': 'no-referrer',
  });
  res.end(JSON.stringify(obj, null, 2));
}

// Если человек случайно открыл адрес API в браузере, отправляем его в интерфейс.
// Сам API остаётся на /api/* и по-прежнему отвечает JSON.
function redirectToWebApp(res) {
  res.writeHead(302, {
    Location: WEB_APP_URL,
    'Cache-Control': 'no-store',
    'X-Content-Type-Options': 'nosniff',
    'Referrer-Policy': 'no-referrer',
  });
  res.end();
}

export const server = createServer(async (req, res) => {
  const url = new URL(req.url, `http://localhost:${PORT}`);
  const path = url.pathname;
  const method = req.method;
  const requestContext = createRequestContext({ method, path });
  // Идентификатор виден клиенту и в локальном error-log. Заголовки запроса,
  // тело, токен и query string в контекст намеренно не копируются.
  res.setHeader('X-Request-ID', requestContext.requestId);

  try {
    if (method === 'GET' && path === '/') {
      return redirectToWebApp(res);
    }

    // --- проверка живости ---
    if (method === 'GET' && path === '/api/health') {
      return send(res, 200, { ok: true, service: 'project-drive-backend' });
    }
    if (method === 'GET' && path === '/api/ready') {
      const readiness = db.getDatabaseReadiness();
      return send(res, readiness.ready ? 200 : 503, { ...readiness, service: 'project-drive-backend' });
    }

    // Единственный публичный источник цен операций. Клиент показывает эти
    // значения, но при генерации сервер всё равно пересчитывает сумму сам.
    if (method === 'GET' && path === '/api/pricing') {
      // Новая модель: 1 кредит = 1 проход AI. Клиент считает число проходов
      // по этому правилу; per-операционных цен больше нет.
      return send(res, 200, { creditsPerPass: CREDITS_PER_PASS, pricingVersion: PRICING_VERSION, rule: 'one_credit_per_pass' });
    }
    if (method === 'GET' && path === '/api/catalog/customization') {
      return send(res, 200, db.getCustomizationCatalog());
    }

    const publicShareMatch = path.match(/^\/api\/public\/results\/([a-f0-9]{64})$/i);
    if (method === 'GET' && publicShareMatch) {
      const shared = db.getPublicShare(publicShareMatch[1]);
      return shared ? send(res, 200, shared) : send(res, 404, { error: 'публичная ссылка выключена или не существует' });
    }

    // --- каталог дисков: публичное чтение, персональные списки после входа ---
    if (method === 'GET' && path === '/api/wheels') {
      const result = db.listWheels({
        search: url.searchParams.get('q') || '', brand: url.searchParams.get('brand') || '',
        kind: url.searchParams.get('kind') || '', diameter: url.searchParams.get('diameter'),
        finish: url.searchParams.get('finish') || '', color: url.searchParams.get('color') || '', style: url.searchParams.get('style') || '',
        cursor: url.searchParams.get('cursor') || '', limit: url.searchParams.get('limit') || 24,
      });
      return send(res, 200, { ...result, facets: db.listWheelFacets() });
    }
    if (method === 'GET' && path === '/api/wheels/favorites') {
      const user = auth.checkSession(tokenFrom(req));
      if (!user) return send(res, 401, { error: 'нужен вход' });
      return send(res, 200, db.listFavoriteWheels(user.id, url.searchParams.get('limit')));
    }
    if (method === 'GET' && path === '/api/wheels/recent') {
      const user = auth.checkSession(tokenFrom(req));
      if (!user) return send(res, 401, { error: 'нужен вход' });
      return send(res, 200, db.listRecentWheels(user.id, url.searchParams.get('limit')));
    }
    const favoriteMatch = path.match(/^\/api\/wheels\/([^/]+)\/favorite$/);
    if (method === 'POST' && favoriteMatch) {
      const user = auth.checkSession(tokenFrom(req));
      if (!user) return send(res, 401, { error: 'нужен вход' });
      const result = db.toggleFavoriteWheel({ userId: user.id, variantId: decodeURIComponent(favoriteMatch[1]) });
      return result ? send(res, 200, result) : send(res, 404, { error: 'диск не найден' });
    }
    const viewedMatch = path.match(/^\/api\/wheels\/([^/]+)\/view$/);
    if (method === 'POST' && viewedMatch) {
      const user = auth.checkSession(tokenFrom(req));
      if (!user) return send(res, 401, { error: 'нужен вход' });
      const ok = db.recordRecentlyViewedWheel({ userId: user.id, variantId: decodeURIComponent(viewedMatch[1]) });
      return ok ? send(res, 200, { ok: true }) : send(res, 404, { error: 'диск не найден' });
    }

    // --- минимальная админка каталога ---
    if (path.startsWith('/api/admin/')) {
      const user = auth.checkSession(tokenFrom(req));
      if (!user) return send(res, 401, { error: 'нужен вход' });
      if (!isAdmin(user)) return send(res, 403, { error: 'нужен доступ администратора' });

      if (method === 'GET' && path === '/api/admin/overview') {
        return send(res, 200, {
          wheels: db.listAdminWheels(), aiJobs: db.listAiJobs(), audit: db.listAuditLog(), users: db.listUsers(),
          wheelCatalogSources: db.listWheelCatalogSources(),
          productAnalytics: db.getProductAnalytics(),
          invites: db.listInviteCodes(), waitlist: db.listWaitlist(),
        });
      }
      if (method === 'POST' && path === '/api/admin/wheels') {
        const entry = parseWheelEntry(await readBody(req));
        return send(res, 201, db.createWheelCatalogEntry({ ...entry, actorUserId: user.id }));
      }
      if (method === 'POST' && path === '/api/admin/wheels/import') {
        const body = await readBody(req);
        if (!Array.isArray(body.rows) || !body.rows.length || body.rows.length > 500) return send(res, 400, { error: 'нужно от 1 до 500 строк' });
        const entries = body.rows.map((row) => ({ ...parseWheelEntry(row), actorUserId: user.id }));
        const created = db.importWheelCatalogEntries(entries);
        return send(res, 201, { created: created.length, items: created });
      }
      if (method === 'POST' && path === '/api/admin/wheels/feed') {
        const body = await readBody(req, 2 * 1024 * 1024);
        if (!Array.isArray(body.rows) || !body.rows.length || body.rows.length > 5000) {
          return send(res, 400, { error: 'нужно от 1 до 5000 строк официального фида' });
        }
        const result = db.importAuthorizedWheelFeedEntries({
          sourceSlug: String(body.sourceSlug || '').trim(), rows: body.rows, actorUserId: user.id,
        });
        return send(res, 200, result);
      }
      const adminWheelMatch = path.match(/^\/api\/admin\/wheels\/([^/]+)$/);
      if (method === 'PATCH' && adminWheelMatch) {
        const { visible } = await readBody(req);
        const result = db.setWheelVisibility({ variantId: decodeURIComponent(adminWheelMatch[1]), visible: Boolean(visible), actorUserId: user.id });
        return result ? send(res, 200, result) : send(res, 404, { error: 'диск не найден' });
      }
      const referenceMatch = path.match(/^\/api\/admin\/wheels\/([^/]+)\/reference$/);
      if (method === 'POST' && referenceMatch) {
        const rightsSource = String(url.searchParams.get('rightsSource') || '').trim().slice(0, 250);
        const rightsBasis = String(url.searchParams.get('rightsBasis') || '').trim().slice(0, 250);
        const watermarkFreeConfirmed = url.searchParams.get('watermarkFreeConfirmed') === 'true';
        const angle = url.searchParams.get('angle');
        if (!rightsSource || !rightsBasis || !watermarkFreeConfirmed || !['front', 'three_quarter'].includes(angle)) return send(res, 400, { error: 'нужны источник, основание прав, ракурс и подтверждение отсутствия водяного знака' });
        let raw;
        try { raw = await readRaw(req, 10 * 1024 * 1024); } catch { return send(res, 413, { error: 'файл больше 10 МБ' }); }
        const contentType = String(req.headers['content-type'] || '').split(';')[0];
        const image = await validateWheelReference(raw, contentType);
        const ext = contentType === 'image/webp' ? 'webp' : 'png';
        const fileName = `${randomUUID()}.${ext}`;
        const storedUrl = await objectStorage.put({ scope: 'wheel-uploads', name: fileName, bytes: image.buffer });
        const saved = db.addWheelReferenceImage({
          variantId: decodeURIComponent(referenceMatch[1]), url: storedUrl,
          mimeType: contentType, width: image.width, height: image.height, hasAlpha: image.hasAlpha,
          angle, rightsSource, rightsBasis, watermarkFreeConfirmed, actorUserId: user.id,
        });
        return saved ? send(res, 201, saved) : send(res, 404, { error: 'диск не найден' });
      }
      if (method === 'POST' && path === '/api/admin/credits/adjust') {
        const { userId, delta, reason } = await readBody(req);
        const cleanReason = String(reason || '').trim().slice(0, 250);
        if (!cleanReason) return send(res, 400, { error: 'укажи причину корректировки' });
        return send(res, 200, db.adjustCreditsByAdmin({ userId, delta: Number(delta), reason: cleanReason, actorUserId: user.id }));
      }

      // --- Инвайт-коды (закрытая бета): раздаём генерации без оплаты ---
      if (method === 'POST' && path === '/api/admin/invites') {
        const { code, credits, maxUses, note } = await readBody(req);
        try { return send(res, 201, db.createInviteCode({ code, credits, maxUses, note, createdBy: user.id })); }
        catch (e) { return send(res, e.statusCode || 400, { error: e.message }); }
      }
      if (method === 'GET' && path === '/api/admin/invites') {
        return send(res, 200, { invites: db.listInviteCodes() });
      }
      const inviteToggle = path.match(/^\/api\/admin\/invites\/([^/]+)$/);
      if (method === 'PATCH' && inviteToggle) {
        const { active } = await readBody(req);
        return send(res, 200, db.setInviteActive({ code: decodeURIComponent(inviteToggle[1]), active: Boolean(active) }));
      }

      // --- Лист ожидания: смотрим заявки и одним кликом создаём код-приглашение ---
      if (method === 'GET' && path === '/api/admin/waitlist') {
        return send(res, 200, { waitlist: db.listWaitlist() });
      }
      if (method === 'POST' && path === '/api/admin/waitlist/invite') {
        const { email, credits, note } = await readBody(req);
        try {
          const code = 'BETA-' + Math.random().toString(36).slice(2, 8).toUpperCase();
          const invite = db.createInviteCode({ code, credits: Number(credits) || 5, maxUses: 1, note: note || `waitlist ${email || ''}`.slice(0, 200), createdBy: user.id });
          if (email) db.markWaitlistInvited({ email, code: invite.code });
          return send(res, 201, invite);
        } catch (e) { return send(res, e.statusCode || 400, { error: e.message }); }
      }
    }

    // --- проекты (машины) — ТОЛЬКО свои, берём пользователя из пропуска ---
    if (method === 'POST' && path === '/api/projects') {
      const user = auth.checkSession(tokenFrom(req));
      if (!user) return send(res, 401, { error: 'нужен вход' });
      const { name, vehicleMake, vehicleModel } = await readBody(req);
      const cleanName = typeof name === 'string' ? name.trim() : '';
      const cleanMake = typeof vehicleMake === 'string' ? vehicleMake.trim() : '';
      const cleanModel = typeof vehicleModel === 'string' ? vehicleModel.trim() : '';
      if (!cleanName || cleanName.length > 80) return send(res, 400, { error: 'название должно содержать от 1 до 80 символов' });
      if (cleanMake.length > 60 || cleanModel.length > 80) return send(res, 400, { error: 'марка или модель слишком длинная' });
      // userId берём из пропуска, а НЕ из тела запроса — так нельзя создать проект "за другого"
      const project = db.createProject({
        userId: user.id, name: cleanName,
        vehicleMake: cleanMake || null, vehicleModel: cleanModel || null,
      });
      db.recordProductEvent({ userId: user.id, projectId: project.id, eventName: 'project_created', details: { vehicleLabeled: Boolean(cleanMake || cleanModel) } });
      return send(res, 201, project);
    }
    if (method === 'GET' && path === '/api/projects') {
      const user = auth.checkSession(tokenFrom(req));
      if (!user) return send(res, 401, { error: 'нужен вход' });
      // Garage получает только проекты этого пользователя вместе с безопасной
      // краткой сводкой: исходник, число версий и последнюю картинку.
      return send(res, 200, db.listProjectsWithSummary(user.id));
    }
    if (method === 'PATCH' && path.startsWith('/api/projects/')) {
      const user = auth.checkSession(tokenFrom(req));
      if (!user) return send(res, 401, { error: 'нужен вход' });
      const projectId = decodeURIComponent(path.slice('/api/projects/'.length));
      const { name } = await readBody(req);
      const cleanName = typeof name === 'string' ? name.trim() : '';
      if (!cleanName || cleanName.length > 80) return send(res, 400, { error: 'название должно содержать от 1 до 80 символов' });
      const project = db.updateProjectName({ projectId, userId: user.id, name: cleanName });
      if (!project) return send(res, 404, { error: 'проект не найден' });
      return send(res, 200, project);
    }

    // --- версии (варианты) проекта — с проверкой, что проект твой ---
    if (method === 'GET' && path === '/api/versions') {
      const user = auth.checkSession(tokenFrom(req));
      if (!user) return send(res, 401, { error: 'нужен вход' });
      const projectId = url.searchParams.get('projectId');
      const project = db.getProject(projectId);
      if (!project || project.user_id !== user.id) return send(res, 404, { error: 'проект не найден' });
      return send(res, 200, db.listVersions(projectId));
    }

    // Одна сохранённая версия для прямой ссылки /result/:versionId.
    // Отдаём её только владельцу проекта и сразу добавляем исходную фотографию.
    if (method === 'GET' && path.match(/^\/api\/versions\/[^/]+$/)) {
      const user = auth.checkSession(tokenFrom(req));
      if (!user) return send(res, 401, { error: 'нужен вход' });
      const versionId = decodeURIComponent(path.split('/')[3]);
      const version = db.getVersion(versionId);
      const project = version ? db.getProject(version.project_id) : null;
      if (!version || !project || project.user_id !== user.id) return send(res, 404, { error: 'версия не найдена' });

      let operations = [];
      try { operations = JSON.parse(version.config_json || '[]'); } catch { /* Старую повреждённую запись покажем без операций. */ }
      const source = db.getLatestSourceAsset(project.id);
      return send(res, 200, {
        id: version.id,
        projectId: project.id,
        projectName: project.name,
        operations,
        sourceUrl: source?.url || null,
        outputUrl: version.output_url || source?.url || null,
        creditsCharged: version.credits_charged,
        plannedCredits: version.planned_credits,
        generationStatus: version.status,
        warning: version.warning,
        internalCostUsd: Number(version.internal_cost_usd || 0),
        createdAt: version.created_at,
      });
    }

    if (method === 'POST' && path.match(/^\/api\/versions\/[^/]+\/report$/)) {
      const user = auth.checkSession(tokenFrom(req));
      if (!user) return send(res, 401, { error: 'нужен вход' });
      const versionId = decodeURIComponent(path.split('/')[3]);
      const version = db.getVersion(versionId);
      const project = version ? db.getProject(version.project_id) : null;
      if (!version || !project || project.user_id !== user.id) return send(res, 404, { error: 'версия не найдена' });

      const { reason, note } = await readBody(req);
      const allowedReasons = new Set(['car_changed', 'wheels_wrong', 'wrap_wrong', 'tint_wrong', 'artifacts', 'other']);
      if (!allowedReasons.has(reason)) return send(res, 400, { error: 'выбери причину' });
      const cleanNote = typeof note === 'string' ? note.trim().slice(0, 500) : null;
      // Жалоба лишь ставит версию в очередь на ручную проверку. Баланс здесь
      // не меняем: решение о возврате будет отдельным действием администратора.
      const report = db.createResultReport({ versionId, userId: user.id, reason, note: cleanNote || null });
      if (!report.already) db.recordProductEvent({ userId: user.id, projectId: project.id, versionId, eventName: 'result_reported', details: { reason } });
      return send(res, 201, report);
    }

    const shareMatch = path.match(/^\/api\/versions\/([^/]+)\/share$/);
    if (method === 'POST' && shareMatch) {
      const user = auth.checkSession(tokenFrom(req));
      if (!user) return send(res, 401, { error: 'нужен вход' });
      const versionId = decodeURIComponent(shareMatch[1]);
      const version = db.getVersion(versionId);
      const project = version ? db.getProject(version.project_id) : null;
      if (!version || !project || project.user_id !== user.id) return send(res, 404, { error: 'версия не найдена' });
      const { enabled } = await readBody(req);
      if (enabled === true) {
        const share = db.enablePublicShare(versionId);
        db.recordProductEvent({ userId: user.id, projectId: project.id, versionId, eventName: 'public_share_enabled' });
        return send(res, 200, { ...share, path: `/share/${share.token}` });
      }
      const disabled = db.disablePublicShare(versionId);
      if (disabled.changed) db.recordProductEvent({ userId: user.id, projectId: project.id, versionId, eventName: 'public_share_disabled' });
      return send(res, 200, disabled);
    }

    // --- кошелёк — только свой, пользователь из пропуска ---
    if (method === 'GET' && path === '/api/wallet') {
      const user = auth.checkSession(tokenFrom(req));
      if (!user) return send(res, 401, { error: 'нужен вход' });
      return send(res, 200, db.getWallet(user.id));
    }
    if (method === 'GET' && path === '/api/wallet/transactions') {
      const user = auth.checkSession(tokenFrom(req));
      if (!user) return send(res, 401, { error: 'нужен вход' });
      // История, как и баланс, берётся только для владельца текущей сессии.
      return send(res, 200, db.listTransactions(user.id));
    }
    if (method === 'GET' && path === '/api/account/export') {
      const user = auth.checkSession(tokenFrom(req));
      if (!user) return send(res, 401, { error: 'нужен вход' });
      const exported = db.exportUserData(user.id);
      return send(res, 200, exported);
    }
    // --- вход / регистрация ---
    if (method === 'POST' && path === '/api/auth/register') {
      const { email, password, name, inviteCode } = await readBody(req);
      let account;
      try { account = auth.register({ email, password, name }); }
      catch (e) { return send(res, 400, { error: e.message }); }
      // Необязательный инвайт-код: если передан и валиден — сразу начисляем генерации.
      let invite = null;
      if (inviteCode) {
        const redeemed = db.redeemInviteCode({ userId: account.user.id, code: inviteCode });
        invite = redeemed.ok ? { ok: true, credits: redeemed.credits } : { ok: false, reason: redeemed.reason };
      }
      return send(res, 201, { ...account, invite });
    }
    // --- Активировать инвайт-код уже вошедшим пользователем ---
    if (method === 'POST' && path === '/api/invites/redeem') {
      const user = auth.checkSession(tokenFrom(req));
      if (!user) return send(res, 401, { error: 'нужен вход' });
      const { code } = await readBody(req);
      const result = db.redeemInviteCode({ userId: user.id, code });
      if (result.ok) return send(res, 200, result);
      const messages = { empty: 'введите код', not_found: 'код не найден или выключен', exhausted: 'код уже исчерпан', already_redeemed: 'вы уже активировали этот код' };
      return send(res, 400, { error: messages[result.reason] || 'код не принят', reason: result.reason });
    }
    // --- Публичная запись в лист ожидания (без входа) ---
    if (method === 'POST' && path === '/api/waitlist') {
      const { email, note } = await readBody(req);
      try { return send(res, 201, db.addWaitlistEmail({ email, note })); }
      catch (e) { return send(res, e.statusCode || 400, { error: e.message }); }
    }
    if (method === 'POST' && path === '/api/auth/login') {
      const { email, password } = await readBody(req);
      const key = loginKey(req, email);
      const blocked = loginBlock(key);
      if (blocked) {
        const retryAfter = Math.max(1, Math.ceil((LOGIN_WINDOW_MS - (Date.now() - blocked.startedAt)) / 1000));
        res.setHeader('Retry-After', String(retryAfter));
        return send(res, 429, { error: 'слишком много попыток входа, попробуй позже', retryAfter });
      }
      try {
        const result = auth.login({ email, password });
        loginFailures.delete(key);
        return send(res, 200, result);
      } catch (e) {
        recordLoginFailure(key);
        return send(res, 401, { error: e.message });
      }
    }
    if (method === 'GET' && path === '/api/auth/me') {
      const user = auth.checkSession(tokenFrom(req));   // кто я по пропуску?
      if (!user) return send(res, 401, { error: 'нужен вход' });
      return send(res, 200, user);
    }
    if (method === 'POST' && path === '/api/auth/logout') {
      auth.logout(tokenFrom(req));
      return send(res, 200, { ok: true });
    }

    // --- загрузка фото машины к своему проекту ---
    // Файл шлём "сырыми байтами" в теле, тип — в заголовке Content-Type,
    // проект — в ?projectId=… Пример (curl):
    //   curl -X POST "http://localhost:3000/api/upload?projectId=ID" \
    //        -H "Authorization: Bearer TOKEN" -H "Content-Type: image/jpeg" \
    //        --data-binary "@my-car.jpg"
    if (method === 'POST' && path === '/api/upload') {
      const user = auth.checkSession(tokenFrom(req));
      if (!user) return send(res, 401, { error: 'нужен вход' });
      const project = db.getProject(url.searchParams.get('projectId'));
      if (!project || project.user_id !== user.id) return send(res, 404, { error: 'проект не найден' });

      const ct = (req.headers['content-type'] || '').split(';')[0].trim();
      const extByType = { 'image/jpeg': 'jpg', 'image/png': 'png', 'image/webp': 'webp', 'image/heic': 'heic' };
      if (!extByType[ct]) return send(res, 415, { error: 'формат не поддерживается (JPG/PNG/WEBP/HEIC)' });

      let buf;
      try { buf = await readRaw(req, 20 * 1024 * 1024); }      // лимит ~20 МБ
      catch { return send(res, 413, { error: 'файл больше 20 МБ' }); }
      if (!buf.length) return send(res, 400, { error: 'пустой файл' });

      const originalBytes = buf.length;
      let preflight;
      try { preflight = await validateVehiclePhoto(buf); }
      catch (error) {
        if (error instanceof VehiclePhotoValidationError) return send(res, 422, { error: error.message, code: error.code });
        return send(res, 422, { error: 'изображение повреждено или этот вариант HEIC не поддерживается' });
      }
      try { buf = await normalizeUploadedImage(buf); }
      catch { return send(res, 422, { error: 'изображение повреждено или этот вариант HEIC не поддерживается' }); }

      // После нормализации любой разрешённый вход хранится как JPEG без EXIF/GPS.
      const fname = randomUUID() + '.jpg';
      const storedUrl = await objectStorage.put({ scope: 'uploads', name: fname, bytes: buf });
      const assetId = db.addSourceAsset({
        projectId: project.id, url: storedUrl,
        contentSha256: createHash('sha256').update(buf).digest('hex'),
      });
      db.recordProductEvent({ userId: user.id, projectId: project.id, eventName: 'photo_uploaded', details: { width: preflight.width, height: preflight.height, originalBytes } });
      return send(res, 201, { id: assetId, url: storedUrl, bytes: buf.length, originalBytes, normalized: true, preflight });
    }

    // --- reference-фото диска пользователя ---
    // Храним отдельно от фото машины (type=wheel_reference), чтобы референс
    // никогда не мог случайно стать исходником следующей генерации.
    if (method === 'POST' && path === '/api/wheel-reference') {
      const user = auth.checkSession(tokenFrom(req));
      if (!user) return send(res, 401, { error: 'нужен вход' });
      const project = db.getProject(url.searchParams.get('projectId'));
      if (!project || project.user_id !== user.id) return send(res, 404, { error: 'проект не найден' });

      const ct = (req.headers['content-type'] || '').split(';')[0].trim();
      if (!['image/jpeg', 'image/png', 'image/webp', 'image/heic'].includes(ct)) {
        return send(res, 415, { error: 'формат не поддерживается (JPG/PNG/WEBP/HEIC)' });
      }
      let buf;
      try { buf = await readRaw(req, 20 * 1024 * 1024); }
      catch { return send(res, 413, { error: 'файл больше 20 МБ' }); }
      if (!buf.length) return send(res, 400, { error: 'пустой файл' });

      let preflight;
      try {
        preflight = await validateVehiclePhoto(buf);
        buf = await normalizeUploadedImage(buf);
      } catch (error) {
        if (error instanceof VehiclePhotoValidationError) return send(res, 422, { error: error.message, code: error.code });
        return send(res, 422, { error: 'изображение повреждено или этот вариант HEIC не поддерживается' });
      }
      const fname = randomUUID() + '.jpg';
      const storedUrl = await objectStorage.put({ scope: 'uploads', name: fname, bytes: buf });
      const assetId = db.addSourceAsset({
        projectId: project.id, type: 'wheel_reference', url: storedUrl,
        contentSha256: createHash('sha256').update(buf).digest('hex'),
      });
      db.recordProductEvent({ userId: user.id, projectId: project.id, eventName: 'wheel_reference_uploaded', details: { width: preflight.width, height: preflight.height } });
      return send(res, 201, { id: assetId, url: storedUrl, bytes: buf.length, normalized: true, preflight });
    }

    // --- раздача загруженных файлов (ТОЛЬКО для локальной разработки) ---
    // TODO(prod): в проде файлы приватные, отдаются по временным (signed) ссылкам,
    // а не так свободно. Это лишь чтобы посмотреть загруженное на localhost.
    const uploadMatch = method === 'GET' && path.match(/^\/uploads\/([0-9a-f-]{36}\.(?:jpg|png))$/i);
    if (uploadMatch) {
      // Сервер сам создаёт имена как UUID.jpg. Строгий шаблон не позволяет
      // использовать этот маршрут для чтения произвольного файла с диска.
      const objectUrl = `/uploads/${uploadMatch[1]}`;
      if (!await objectStorage.exists(objectUrl)) return send(res, 404, { error: 'файл не найден' });
      res.writeHead(200, {
        'Content-Type': objectUrl.endsWith('.png') ? 'image/png' : 'image/jpeg',
        'Cache-Control': 'private, max-age=3600',
        'X-Content-Type-Options': 'nosniff',
        'Cross-Origin-Resource-Policy': 'same-origin',
      });
      return res.end(await objectStorage.get(objectUrl));
    }

    const wheelUploadMatch = method === 'GET' && path.match(/^\/wheel-uploads\/([0-9a-f-]{36}\.(?:png|webp))$/i);
    if (wheelUploadMatch) {
      const objectUrl = `/wheel-uploads/${wheelUploadMatch[1]}`;
      if (!await objectStorage.exists(objectUrl)) return send(res, 404, { error: 'файл не найден' });
      res.writeHead(200, {
        'Content-Type': objectUrl.endsWith('.webp') ? 'image/webp' : 'image/png',
        'Cache-Control': 'public, max-age=31536000, immutable',
        'X-Content-Type-Options': 'nosniff',
      });
      return res.end(await objectStorage.get(objectUrl));
    }

    // --- ПАКЕТЫ КРЕДИТОВ и ОПЛАТА (каркас; провайдер пока заглушка) ---
    // Цены УСЛОВНЫЕ — поставим реальные после теста генерации (когда узнаем цену рендера).
    const CREDIT_PACKS = {
      starter: { credits: 150,  amountCents: 1200 },   // $12.00
      builder: { credits: 500,  amountCents: 3200 },   // $32.00  (выгоднее)
      pro:     { credits: 1500, amountCents: 8400 },   // $84.00
    };

    if (method === 'GET' && path === '/api/packs') {
      return send(res, 200, CREDIT_PACKS);            // список пакетов (публично, для страницы Credits)
    }

    // Шаг 1: человек нажал "купить пакет" -> создаём заказ (pending).
    // В ПРОДЕ здесь же создаётся checkout-сессия у платёжки (Lemon Squeezy/Paddle)
    // и возвращается ЕЁ ссылка, куда уходит человек платить. Сейчас — заглушка-ссылка.
    if (method === 'POST' && path === '/api/checkout') {
      if (!MOCK_PAYMENTS_ENABLED) return send(res, 503, { error: 'покупка кредитов отключена до выбора платёжного провайдера' });
      const user = auth.checkSession(tokenFrom(req));
      if (!user) return send(res, 401, { error: 'нужен вход' });
      const { packId } = await readBody(req);
      const pack = CREDIT_PACKS[packId];
      if (!pack) return send(res, 400, { error: 'нет такого пакета' });
      const order = db.createOrder({ userId: user.id, packId, credits: pack.credits, amountCents: pack.amountCents });
      // TODO(prod): создать checkout у платёжки и вернуть её URL. Пока — заглушка:
      const checkoutUrl = `/mock-pay?orderId=${order.id}`;
      return send(res, 201, { orderId: order.id, checkoutUrl, credits: pack.credits });
    }

    // Шаг 2: платёжка сообщает "оплата прошла" -> начисляем кредиты (идемпотентно).
    // В ПРОДЕ этот маршрут вызывает САМА платёжка (webhook), и НАЧАЛО должно
    // ПРОВЕРЯТЬ подпись запроса, иначе кто угодно сможет "начислить" себе кредиты.
    if (method === 'POST' && path === '/api/webhook/payment') {
      if (!MOCK_PAYMENTS_ENABLED) return send(res, 404, { error: 'маршрут не найден' });
      if (!isLoopbackRequest(req)) return send(res, 404, { error: 'маршрут не найден' });
      // TODO(prod): здесь ОБЯЗАТЕЛЬНО проверить подпись вебхука от платёжки:
      //   const sig = req.headers['x-signature']; if(!verifySignature(rawBody, sig)) return 401;
      // Без этого начислять кредиты НЕЛЬЗЯ. Сейчас (dev) подпись не проверяется.
      const { orderId } = await readBody(req);
      const result = db.markOrderPaid(orderId);
      if (!result.ok) return send(res, 404, { error: 'заказ не найден' });
      return send(res, 200, result);   // {ok:true, credited:N} или {ok:true, already:true}
    }

    // --- ГЕНЕРАЦИЯ (главная петля продукта) ---
    // Клиент присылает ЧТО менять (operations); цену и списание кредитов решает сервер.
    // AI пока заглушка (mock). Тестовый forceFail намеренно недоступен через HTTP.
    if (method === 'POST' && path === '/api/generate') {
      const user = auth.checkSession(tokenFrom(req));
      if (!user) return send(res, 401, { error: 'нужен вход' });
      const { projectId, operations } = await readBody(req);
      const ipHash = createHash('sha256').update(String(req.socket.remoteAddress || 'unknown')).digest('hex');
      const r = await generateForProject({ db, userId: user.id, projectId, operations, ipHash, requestId: requestContext.requestId });
      const ownedProject = db.getProject(projectId);
      // Не создаём событие для случайного/чужого projectId: иначе внешний ключ
      // превратил бы корректный 404 в серверную ошибку и засорил аналитику.
      if (ownedProject?.user_id === user.id) {
        db.recordProductEvent({
          userId: user.id, projectId,
          versionId: r.versionId || null,
          eventName: r.ok ? 'generation_succeeded' : 'generation_failed',
          details: { mode: process.env.PROJECT_DRIVE_AI_MODE || 'mock', cached: Boolean(r.cached), statusCode: r.code, creditsCharged: r.creditsCharged || 0, operationCount: Array.isArray(operations) ? operations.length : 0 },
        });
      }
      return send(res, r.ok ? 201 : r.code, r);
    }

    // если маршрут не найден
    return send(res, 404, { error: 'маршрут не найден: ' + method + ' ' + path });
  } catch (e) {
    const status = e.statusCode || 500;
    if (status >= 500) writeErrorLog(requestContext, e, status);
    return send(res, status, { error: String(e.message || e), requestId: requestContext.requestId });
  }
});

server.listen(PORT, HOST, () => {
  const address = server.address();
  const listeningPort = typeof address === 'object' && address ? address.port : PORT;
  console.log(`Project Drive backend запущен: http://${HOST}:${listeningPort}`);
  console.log(`Интерфейс Project Drive: ${WEB_APP_URL}`);
  console.log(`Проверка: открой http://localhost:${listeningPort}/api/health`);
});
