-- ============================================================================
-- schema.sql — структура базы данных ("склад" проекта Project Drive).
-- ----------------------------------------------------------------------------
-- ЧТО ЭТО: описание таблиц. Таблица = как лист в Excel: строки и колонки.
-- Здесь только та часть, что НЕ зависит от генераций (пользователи, машины,
-- варианты, кошелёк кредитов). AI и оплату добавим отдельными шагами.
--
-- ВАЖНО ДЛЯ CODEX: сейчас для простоты используется SQLite (файл на диске,
-- ноль настройки — удобно для локальной разработки и обучения).
-- В продакшене по плану проекта — PostgreSQL. Типы намеренно простые,
-- чтобы перенос на Postgres был лёгким (TEXT/INTEGER есть в обеих).
-- ============================================================================

-- Пользователи. Пароль/вход добавим следующим шагом (сейчас только профиль).
CREATE TABLE IF NOT EXISTS users (
  id          TEXT PRIMARY KEY,          -- уникальный id (UUID)
  email       TEXT UNIQUE NOT NULL,      -- почта, не может повторяться
  name        TEXT,                      -- имя (необязательно)
  created_at  TEXT NOT NULL              -- когда создан (дата-время строкой ISO)
);

-- Проект = одна машина пользователя (одно загруженное фото + его варианты).
CREATE TABLE IF NOT EXISTS car_projects (
  id             TEXT PRIMARY KEY,
  user_id        TEXT NOT NULL,          -- чей это проект (ссылка на users.id)
  name           TEXT NOT NULL,          -- напр. "BMW M4 Competition"
  vehicle_make   TEXT,                   -- марка (заполняется распознаванием/вручную)
  vehicle_model  TEXT,                   -- модель
  created_at     TEXT NOT NULL,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

-- Исходные файлы проекта (сейчас — загруженное фото машины).
CREATE TABLE IF NOT EXISTS source_assets (
  id          TEXT PRIMARY KEY,
  project_id  TEXT NOT NULL,
  type        TEXT NOT NULL,             -- пока всегда 'photo'
  url         TEXT NOT NULL,             -- где лежит файл (ссылка в хранилище)
  created_at  TEXT NOT NULL,
  FOREIGN KEY (project_id) REFERENCES car_projects(id) ON DELETE CASCADE
);

-- Версии = сохранённые варианты (оригинал, зелёный сатин, чёрные диски и т.д.).
-- Каждая версия неизменна (immutable snapshot): что сгенерировали — то и лежит.
CREATE TABLE IF NOT EXISTS project_versions (
  id               TEXT PRIMARY KEY,
  project_id       TEXT NOT NULL,
  config_json      TEXT NOT NULL,        -- что выбрано (плёнка/тонировка/диски) в JSON
  output_url       TEXT,                 -- ссылка на результат (пусто, пока нет AI)
  credits_charged  INTEGER NOT NULL DEFAULT 0, -- сколько кредитов стоила
  created_at       TEXT NOT NULL,
  FOREIGN KEY (project_id) REFERENCES car_projects(id) ON DELETE CASCADE
);

-- Кошелёк кредитов: у каждого пользователя один баланс.
CREATE TABLE IF NOT EXISTS credit_wallets (
  user_id  TEXT PRIMARY KEY,
  balance  INTEGER NOT NULL DEFAULT 0,   -- кредиты не могут уходить в минус (следим в коде)
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

-- История движения кредитов (начислили/списали) — для прозрачности и админки.
CREATE TABLE IF NOT EXISTS credit_transactions (
  id          TEXT PRIMARY KEY,
  user_id     TEXT NOT NULL,
  delta       INTEGER NOT NULL,          -- +100 начислили, -25 списали
  reason      TEXT NOT NULL,             -- напр. 'signup_bonus', 'generate', 'purchase'
  created_at  TEXT NOT NULL,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

-- Ручная жалоба на неудачную версию. Одна версия — одна открытая запись;
-- позже админ сможет менять status после проверки.
CREATE TABLE IF NOT EXISTS result_reports (
  id          TEXT PRIMARY KEY,
  version_id  TEXT UNIQUE NOT NULL,
  user_id     TEXT NOT NULL,
  reason      TEXT NOT NULL,
  note        TEXT,
  status      TEXT NOT NULL DEFAULT 'open',
  created_at  TEXT NOT NULL,
  FOREIGN KEY (version_id) REFERENCES project_versions(id) ON DELETE CASCADE,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

-- Индексы соответствуют реальным спискам приложения: Garage, версии, исходники,
-- журнал кредитов и будущая очередь ручной проверки.
CREATE INDEX IF NOT EXISTS idx_users_email_nocase
  ON users(email COLLATE NOCASE);
CREATE INDEX IF NOT EXISTS idx_car_projects_user_created
  ON car_projects(user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_source_assets_project_created
  ON source_assets(project_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_project_versions_project_created
  ON project_versions(project_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_credit_transactions_user_created
  ON credit_transactions(user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_result_reports_user_status
  ON result_reports(user_id, status, created_at DESC);
