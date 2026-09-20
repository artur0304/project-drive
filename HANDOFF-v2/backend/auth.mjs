// ============================================================================
// auth.mjs — вход и регистрация по почте + паролю.
// ----------------------------------------------------------------------------
// Главное правило безопасности: НАСТОЯЩИЙ пароль нигде не хранится.
// Мы храним только его "отпечаток" (хэш). По отпечатку нельзя узнать пароль,
// но можно проверить: совпадает ли введённый при входе пароль с сохранённым.
//
// Без установки библиотек: используем встроенный модуль node:crypto
// (функция scrypt — как раз для безопасного хэширования паролей).
//
// ДЛЯ CODEX: в проде можно заменить scrypt на bcrypt/argon2, а "пропуск"
// (токен сессии) — на JWT или серверные сессии. Названия функций
// register/login/checkSession можно оставить, поменяв только тело.
// ============================================================================

import { scryptSync, randomBytes, timingSafeEqual, randomUUID } from 'node:crypto';
import db, { createUser, getUserByEmail } from './db.mjs';

const SESSION_TTL_MS = 30 * 24 * 60 * 60 * 1000;

function normalizeEmail(email) {
  const value = typeof email === 'string' ? email.trim().toLowerCase() : '';
  if (value.length > 254 || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value)) {
    throw new Error('введи корректный email');
  }
  return value;
}

// --- Таблицы под пароли и "пропуска" (сессии). Создаём, если ещё нет. ---
db.exec(`
  CREATE TABLE IF NOT EXISTS user_credentials (
    user_id       TEXT PRIMARY KEY,       -- чей это пароль (ссылка на users.id)
    password_hash TEXT NOT NULL,          -- отпечаток пароля (соль:хэш), НЕ сам пароль
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
  );
  CREATE TABLE IF NOT EXISTS sessions (
    token       TEXT PRIMARY KEY,         -- "пропуск": длинная случайная строка
    user_id     TEXT NOT NULL,
    created_at  TEXT NOT NULL,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
  );
`);

// Сделать "отпечаток" пароля: генерируем случайную "соль" и хэшируем пароль с ней.
// Соль нужна, чтобы у двух людей с одинаковым паролем отпечатки были РАЗНЫЕ.
function hashPassword(password) {
  const salt = randomBytes(16).toString('hex');
  const hash = scryptSync(password, salt, 64).toString('hex');
  return `${salt}:${hash}`;          // храним соль и хэш вместе
}

// Проверить пароль против сохранённого отпечатка.
function verifyPassword(password, stored) {
  const [salt, hash] = stored.split(':');
  const test = scryptSync(password, salt, 64).toString('hex');
  // timingSafeEqual — безопасное сравнение (не подскажет злоумышленнику по времени)
  const a = Buffer.from(hash, 'hex');
  const b = Buffer.from(test, 'hex');
  return a.length === b.length && timingSafeEqual(a, b);
}

// --- РЕГИСТРАЦИЯ: создаём пользователя + сохраняем отпечаток пароля ---
export function register({ email, password, name = null }) {
  const cleanEmail = normalizeEmail(email);
  if (typeof password !== 'string' || !password) throw new Error('нужны email и пароль');
  if (password.length < 6) throw new Error('пароль слишком короткий (мин. 6 символов)');
  if (password.length > 128) throw new Error('пароль слишком длинный (макс. 128 символов)');
  if (getUserByEmail(cleanEmail)) throw new Error('пользователь с таким email уже есть');

  const cleanName = typeof name === 'string' ? name.trim().slice(0, 80) : null;

  const user = createUser({ email: cleanEmail, name: cleanName || null }); // создаём профиль (+ кошелёк внутри)
  db.prepare('INSERT INTO user_credentials (user_id, password_hash) VALUES (?, ?)')
    .run(user.id, hashPassword(password));
  const token = startSession(user.id);          // сразу выдаём "пропуск"
  return { user, token };
}

// --- ВХОД: проверяем почту+пароль, выдаём "пропуск" ---
export function login({ email, password }) {
  let cleanEmail;
  try { cleanEmail = normalizeEmail(email); } catch { throw new Error('неверная почта или пароль'); }
  const user = getUserByEmail(cleanEmail);
  const cred = user && db.prepare('SELECT password_hash FROM user_credentials WHERE user_id = ?').get(user.id);
  // Одна и та же ошибка и при неверной почте, и при неверном пароле —
  // чтобы нельзя было по ответу узнать, какие email зарегистрированы.
  if (!user || !cred || typeof password !== 'string' || !verifyPassword(password, cred.password_hash)) {
    throw new Error('неверная почта или пароль');
  }
  const token = startSession(user.id);
  return { user, token };
}

// Создать "пропуск" (сессию) для пользователя.
function startSession(userId) {
  const token = randomBytes(32).toString('hex');   // длинная случайная строка
  db.prepare('INSERT INTO sessions (token, user_id, created_at) VALUES (?, ?, ?)')
    .run(token, userId, new Date().toISOString());
  return token;
}

// Проверить "пропуск" и вернуть пользователя (или null, если пропуск недействителен).
// Так сервер понимает, кто сейчас обращается.
export function checkSession(token) {
  if (!token) return null;
  const row = db.prepare('SELECT user_id, created_at FROM sessions WHERE token = ?').get(token);
  if (!row) return null;
  const createdAt = Date.parse(row.created_at);
  if (!Number.isFinite(createdAt) || Date.now() - createdAt > SESSION_TTL_MS) {
    db.prepare('DELETE FROM sessions WHERE token = ?').run(token);
    return null;
  }
  return db.prepare('SELECT * FROM users WHERE id = ?').get(row.user_id) ?? null;
}

// Выход: удаляем "пропуск".
export function logout(token) {
  db.prepare('DELETE FROM sessions WHERE token = ?').run(token);
}
