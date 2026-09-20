// ============================================================================
// server.mjs — маленький веб-сервер (API), через который сайт общается со "складом".
// ----------------------------------------------------------------------------
// БЕЗ установки чего-либо: используем встроенный в Node модуль http.
// Запуск:  node --experimental-sqlite server.mjs
// Откроется на http://localhost:3000
//
// Что умеет (пока без входа, оплаты и AI — их добавим отдельными шагами):
//   GET  /api/health                     — проверка "сервер жив"
//   POST /api/users        {email,name}  — создать пользователя (+ кошелёк)
//   GET  /api/users                      — список пользователей
//   POST /api/projects     {userId,name} — создать проект (машину)
//   GET  /api/projects?userId=…          — проекты пользователя
//   GET  /api/wallet?userId=…            — баланс кредитов
// Демонстрационные кредиты добавляются только ручным scripts/seed-credits.mjs;
// браузерного маршрута пополнения нет.
//
// ДЛЯ CODEX: это учебный сервер на голом http. В реальном проекте по плану —
// Next.js API routes. Логику (что делает каждый маршрут) можно перенести 1:1,
// вызовы к db.mjs останутся те же.
// ============================================================================

import { createServer } from 'node:http';
import { writeFileSync, readFileSync, existsSync, mkdirSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { randomUUID } from 'node:crypto';
import * as db from './db.mjs';
import * as auth from './auth.mjs';   // вход/регистрация
import { PRICE, generateForProject } from './generation.mjs';  // "мозг" генерации (пока с заглушкой AI)
import { normalizeUploadedImage } from './image-normalizer.mjs';

// папка, куда складываем загруженные фото (создаётся сама)
const UP = join(dirname(fileURLToPath(import.meta.url)), 'uploads');
if (!existsSync(UP)) mkdirSync(UP, { recursive: true });

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

const PORT = 3000;
const HOST = '127.0.0.1';

// Пока настоящий платёжный провайдер не подключён, webhook разрешён только
// процессам на этом компьютере. Внешний запрос не сможет начислить кредиты.
function isLoopbackRequest(req) {
  const address = req.socket.remoteAddress || '';
  return address === '127.0.0.1' || address === '::1' || address === '::ffff:127.0.0.1';
}

// Помощник: прочитать JSON-тело запроса (то, что прислал браузер).
function readBody(req) {
  return new Promise((resolve) => {
    let data = '';
    req.on('data', (c) => (data += c));
    req.on('end', () => { try { resolve(data ? JSON.parse(data) : {}); } catch { resolve({}); } });
  });
}

// Помощник: отправить ответ в формате JSON.
function send(res, status, obj) {
  res.writeHead(status, { 'Content-Type': 'application/json; charset=utf-8' });
  res.end(JSON.stringify(obj, null, 2));
}

const server = createServer(async (req, res) => {
  const url = new URL(req.url, `http://localhost:${PORT}`);
  const path = url.pathname;
  const method = req.method;

  try {
    // --- проверка живости ---
    if (method === 'GET' && path === '/api/health') {
      return send(res, 200, { ok: true, service: 'project-drive-backend' });
    }

    // Единственный публичный источник цен операций. Клиент показывает эти
    // значения, но при генерации сервер всё равно пересчитывает сумму сам.
    if (method === 'GET' && path === '/api/pricing') {
      return send(res, 200, { operations: PRICE });
    }

    // --- пользователи ---
    if (method === 'POST' && path === '/api/users') {
      const { email, name } = await readBody(req);
      if (!email) return send(res, 400, { error: 'нужен email' });
      if (db.getUserByEmail(email)) return send(res, 409, { error: 'такой email уже есть' });
      return send(res, 201, db.createUser({ email, name }));
    }
    if (method === 'GET' && path === '/api/users') {
      return send(res, 200, db.listUsers());
    }

    // --- проекты (машины) — ТОЛЬКО свои, берём пользователя из пропуска ---
    if (method === 'POST' && path === '/api/projects') {
      const user = auth.checkSession(tokenFrom(req));
      if (!user) return send(res, 401, { error: 'нужен вход' });
      const { name, vehicleMake, vehicleModel } = await readBody(req);
      if (!name) return send(res, 400, { error: 'нужен name' });
      // userId берём из пропуска, а НЕ из тела запроса — так нельзя создать проект "за другого"
      return send(res, 201, db.createProject({ userId: user.id, name, vehicleMake, vehicleModel }));
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
      return send(res, 201, db.createResultReport({ versionId, userId: user.id, reason, note: cleanNote || null }));
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
    // --- вход / регистрация ---
    if (method === 'POST' && path === '/api/auth/register') {
      const { email, password, name } = await readBody(req);
      try { return send(res, 201, auth.register({ email, password, name })); }
      catch (e) { return send(res, 400, { error: e.message }); }
    }
    if (method === 'POST' && path === '/api/auth/login') {
      const { email, password } = await readBody(req);
      try { return send(res, 200, auth.login({ email, password })); }
      catch (e) { return send(res, 401, { error: e.message }); }   // 401 = не пустили
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
      try { buf = await normalizeUploadedImage(buf); }
      catch { return send(res, 422, { error: 'изображение повреждено или этот вариант HEIC не поддерживается' }); }

      // После нормализации любой разрешённый вход хранится как JPEG без EXIF/GPS.
      const fname = randomUUID() + '.jpg';
      writeFileSync(join(UP, fname), buf);
      const assetId = db.addSourceAsset({ projectId: project.id, url: '/uploads/' + fname });
      return send(res, 201, { id: assetId, url: '/uploads/' + fname, bytes: buf.length, originalBytes, normalized: true });
    }

    // --- раздача загруженных файлов (ТОЛЬКО для локальной разработки) ---
    // TODO(prod): в проде файлы приватные, отдаются по временным (signed) ссылкам,
    // а не так свободно. Это лишь чтобы посмотреть загруженное на localhost.
    if (method === 'GET' && path.startsWith('/uploads/')) {
      const f = join(UP, path.replace('/uploads/', ''));
      if (!existsSync(f)) return send(res, 404, { error: 'файл не найден' });
      const ext = f.split('.').pop();
      const typeByExt = { jpg: 'image/jpeg', png: 'image/png', webp: 'image/webp', heic: 'image/heic' };
      res.writeHead(200, { 'Content-Type': typeByExt[ext] || 'application/octet-stream' });
      return res.end(readFileSync(f));
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
    // AI пока заглушка (mock). _forceFail:true — только для проверки возврата кредитов.
    if (method === 'POST' && path === '/api/generate') {
      const user = auth.checkSession(tokenFrom(req));
      if (!user) return send(res, 401, { error: 'нужен вход' });
      const { projectId, operations, _forceFail } = await readBody(req);
      const r = await generateForProject({ db, userId: user.id, projectId, operations, forceFail: !!_forceFail });
      return send(res, r.ok ? 201 : r.code, r);
    }

    // если маршрут не найден
    return send(res, 404, { error: 'маршрут не найден: ' + method + ' ' + path });
  } catch (e) {
    return send(res, 500, { error: String(e.message || e) });
  }
});

server.listen(PORT, HOST, () => {
  console.log(`Project Drive backend запущен: http://${HOST}:${PORT}`);
  console.log('Проверка: открой http://localhost:3000/api/health');
});
