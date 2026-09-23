-- Инвайт-коды для закрытой беты: вместо оплаты Артур раздаёт коды на N генераций.
-- Один код можно активировать max_uses раз, и один пользователь — только один раз.
CREATE TABLE IF NOT EXISTS invite_codes (
  code        TEXT PRIMARY KEY,          -- сам код (в верхнем регистре)
  credits     INTEGER NOT NULL,          -- сколько генераций начисляет
  max_uses    INTEGER NOT NULL DEFAULT 1,-- сколько людей могут активировать
  used_count  INTEGER NOT NULL DEFAULT 0,-- сколько уже активировали
  note        TEXT,                      -- заметка ("чат автолюбителей")
  active      INTEGER NOT NULL DEFAULT 1,-- 1 = работает, 0 = выключен
  created_by  TEXT,                      -- id админа, создавшего код
  created_at  TEXT NOT NULL
);

-- Кто какой код активировал — чтобы один пользователь не активировал код дважды.
CREATE TABLE IF NOT EXISTS invite_redemptions (
  code        TEXT NOT NULL,
  user_id     TEXT NOT NULL,
  redeemed_at TEXT NOT NULL,
  credits     INTEGER NOT NULL,
  PRIMARY KEY (code, user_id),
  FOREIGN KEY (code) REFERENCES invite_codes(code) ON DELETE CASCADE,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

-- Лист ожидания на лендинге: человек без кода оставляет email, админ одобряет.
CREATE TABLE IF NOT EXISTS waitlist (
  email        TEXT PRIMARY KEY,
  status       TEXT NOT NULL DEFAULT 'pending',  -- pending | invited
  note         TEXT,
  invited_code TEXT,
  created_at   TEXT NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_invite_redemptions_user ON invite_redemptions(user_id);
