CREATE TABLE wheel_brands (
  id TEXT PRIMARY KEY,
  slug TEXT UNIQUE NOT NULL,
  name TEXT NOT NULL,
  is_oem INTEGER NOT NULL DEFAULT 0 CHECK (is_oem IN (0, 1)),
  visible INTEGER NOT NULL DEFAULT 1 CHECK (visible IN (0, 1)),
  created_at TEXT NOT NULL
);

CREATE TABLE wheel_models (
  id TEXT PRIMARY KEY,
  brand_id TEXT NOT NULL,
  slug TEXT NOT NULL,
  name TEXT NOT NULL,
  supplier TEXT,
  price_cents INTEGER,
  affiliate_link TEXT,
  popularity INTEGER NOT NULL DEFAULT 0,
  image_rights_source TEXT,
  image_rights_basis TEXT,
  visible INTEGER NOT NULL DEFAULT 1 CHECK (visible IN (0, 1)),
  created_at TEXT NOT NULL,
  UNIQUE (brand_id, slug),
  FOREIGN KEY (brand_id) REFERENCES wheel_brands(id) ON DELETE CASCADE
);

CREATE TABLE wheel_variants (
  id TEXT PRIMARY KEY,
  model_id TEXT NOT NULL,
  size_label TEXT NOT NULL,
  diameter INTEGER NOT NULL,
  color TEXT NOT NULL,
  finish TEXT NOT NULL,
  bolt_pattern TEXT,
  offset REAL,
  center_bore REAL,
  visible INTEGER NOT NULL DEFAULT 1 CHECK (visible IN (0, 1)),
  created_at TEXT NOT NULL,
  UNIQUE (model_id, size_label, color, finish),
  FOREIGN KEY (model_id) REFERENCES wheel_models(id) ON DELETE CASCADE
);

CREATE TABLE wheel_reference_images (
  id TEXT PRIMARY KEY,
  variant_id TEXT NOT NULL,
  angle TEXT NOT NULL CHECK (angle IN ('front', 'three_quarter')),
  url TEXT NOT NULL,
  mime_type TEXT NOT NULL CHECK (mime_type IN ('image/png', 'image/webp')),
  width INTEGER NOT NULL,
  height INTEGER NOT NULL,
  has_alpha INTEGER NOT NULL CHECK (has_alpha IN (0, 1)),
  is_primary INTEGER NOT NULL DEFAULT 0 CHECK (is_primary IN (0, 1)),
  rights_source TEXT NOT NULL,
  rights_basis TEXT NOT NULL,
  created_at TEXT NOT NULL,
  FOREIGN KEY (variant_id) REFERENCES wheel_variants(id) ON DELETE CASCADE
);

CREATE TABLE favorite_wheels (
  user_id TEXT NOT NULL,
  variant_id TEXT NOT NULL,
  created_at TEXT NOT NULL,
  PRIMARY KEY (user_id, variant_id),
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  FOREIGN KEY (variant_id) REFERENCES wheel_variants(id) ON DELETE CASCADE
);

CREATE TABLE recently_viewed_wheels (
  user_id TEXT NOT NULL,
  variant_id TEXT NOT NULL,
  viewed_at TEXT NOT NULL,
  PRIMARY KEY (user_id, variant_id),
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  FOREIGN KEY (variant_id) REFERENCES wheel_variants(id) ON DELETE CASCADE
);

CREATE TABLE admin_audit_log (
  id TEXT PRIMARY KEY,
  actor_user_id TEXT NOT NULL,
  action TEXT NOT NULL,
  entity_type TEXT NOT NULL,
  entity_id TEXT,
  details_json TEXT,
  created_at TEXT NOT NULL,
  FOREIGN KEY (actor_user_id) REFERENCES users(id) ON DELETE RESTRICT
);

CREATE TABLE ai_jobs (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  project_id TEXT NOT NULL,
  provider TEXT NOT NULL,
  latency_ms INTEGER,
  cost_usd REAL,
  attempts INTEGER NOT NULL DEFAULT 0,
  error TEXT,
  credits_charged INTEGER NOT NULL DEFAULT 0,
  created_at TEXT NOT NULL,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  FOREIGN KEY (project_id) REFERENCES car_projects(id) ON DELETE CASCADE
);

CREATE INDEX idx_wheel_models_brand_popularity ON wheel_models(brand_id, popularity DESC, id);
CREATE INDEX idx_wheel_variants_filters ON wheel_variants(diameter, finish, color, visible);
CREATE INDEX idx_wheel_reference_variant ON wheel_reference_images(variant_id, is_primary DESC);
CREATE INDEX idx_favorite_wheels_user_created ON favorite_wheels(user_id, created_at DESC);
CREATE INDEX idx_recent_wheels_user_viewed ON recently_viewed_wheels(user_id, viewed_at DESC);
CREATE INDEX idx_admin_audit_created ON admin_audit_log(created_at DESC);
CREATE INDEX idx_ai_jobs_created ON ai_jobs(created_at DESC);

INSERT INTO wheel_brands VALUES
  ('brand-bmw', 'bmw', 'BMW', 1, 1, '2026-09-21T00:00:00.000Z'),
  ('brand-bbs', 'bbs', 'BBS', 0, 1, '2026-09-21T00:00:00.000Z'),
  ('brand-vossen', 'vossen', 'Vossen', 0, 1, '2026-09-21T00:00:00.000Z'),
  ('brand-rotiform', 'rotiform', 'Rotiform', 0, 1, '2026-09-21T00:00:00.000Z');

INSERT INTO wheel_models VALUES
  ('model-437m', 'brand-bmw', '437m', 'Style 437M', NULL, NULL, NULL, 98, 'Project Drive', 'Original catalog illustration', 1, '2026-09-21T00:00:00.000Z'),
  ('model-chr', 'brand-bbs', 'ch-r', 'CH-R', NULL, NULL, NULL, 92, 'Project Drive', 'Original catalog illustration', 1, '2026-09-21T00:00:00.000Z'),
  ('model-hf3', 'brand-vossen', 'hf-3', 'HF-3', NULL, NULL, NULL, 89, 'Project Drive', 'Original catalog illustration', 1, '2026-09-21T00:00:00.000Z'),
  ('model-tmb', 'brand-rotiform', 'tmb', 'TMB', NULL, NULL, NULL, 84, 'Project Drive', 'Original catalog illustration', 1, '2026-09-21T00:00:00.000Z');

INSERT INTO wheel_variants VALUES
  ('wheel-437m-20-ferric', 'model-437m', 'R20', 20, 'Ferric Grey', 'Machined', '5x120', NULL, NULL, 1, '2026-09-21T00:00:00.000Z'),
  ('wheel-437m-19-black', 'model-437m', 'R19', 19, 'Gloss Black', 'Gloss', '5x120', NULL, NULL, 1, '2026-09-21T00:00:00.000Z'),
  ('wheel-chr-19-titanium', 'model-chr', 'R19', 19, 'Titanium', 'Satin', '5x112', NULL, NULL, 1, '2026-09-21T00:00:00.000Z'),
  ('wheel-chr-20-silver', 'model-chr', 'R20', 20, 'Silver', 'Machined', '5x112', NULL, NULL, 1, '2026-09-21T00:00:00.000Z'),
  ('wheel-hf3-21-black', 'model-hf3', 'R21', 21, 'Gloss Black', 'Gloss', '5x112', NULL, NULL, 1, '2026-09-21T00:00:00.000Z'),
  ('wheel-hf3-22-bronze', 'model-hf3', 'R22', 22, 'Satin Bronze', 'Satin', '5x112', NULL, NULL, 1, '2026-09-21T00:00:00.000Z'),
  ('wheel-tmb-19-bronze', 'model-tmb', 'R19', 19, 'Bronze', 'Matte', '5x120', NULL, NULL, 1, '2026-09-21T00:00:00.000Z'),
  ('wheel-tmb-20-silver', 'model-tmb', 'R20', 20, 'Silver', 'Polished', '5x120', NULL, NULL, 1, '2026-09-21T00:00:00.000Z');

INSERT INTO wheel_reference_images VALUES
  ('ref-437m-20', 'wheel-437m-20-ferric', 'front', '/wheel-catalog/437m-ferric.png', 'image/png', 512, 512, 1, 1, 'Project Drive', 'Original catalog illustration', '2026-09-21T00:00:00.000Z'),
  ('ref-437m-19', 'wheel-437m-19-black', 'front', '/wheel-catalog/437m-black.png', 'image/png', 512, 512, 1, 1, 'Project Drive', 'Original catalog illustration', '2026-09-21T00:00:00.000Z'),
  ('ref-chr-19', 'wheel-chr-19-titanium', 'front', '/wheel-catalog/chr-titanium.png', 'image/png', 512, 512, 1, 1, 'Project Drive', 'Original catalog illustration', '2026-09-21T00:00:00.000Z'),
  ('ref-chr-20', 'wheel-chr-20-silver', 'front', '/wheel-catalog/chr-silver.png', 'image/png', 512, 512, 1, 1, 'Project Drive', 'Original catalog illustration', '2026-09-21T00:00:00.000Z'),
  ('ref-hf3-21', 'wheel-hf3-21-black', 'front', '/wheel-catalog/hf3-black.png', 'image/png', 512, 512, 1, 1, 'Project Drive', 'Original catalog illustration', '2026-09-21T00:00:00.000Z'),
  ('ref-hf3-22', 'wheel-hf3-22-bronze', 'front', '/wheel-catalog/hf3-bronze.png', 'image/png', 512, 512, 1, 1, 'Project Drive', 'Original catalog illustration', '2026-09-21T00:00:00.000Z'),
  ('ref-tmb-19', 'wheel-tmb-19-bronze', 'front', '/wheel-catalog/tmb-bronze.png', 'image/png', 512, 512, 1, 1, 'Project Drive', 'Original catalog illustration', '2026-09-21T00:00:00.000Z'),
  ('ref-tmb-20', 'wheel-tmb-20-silver', 'front', '/wheel-catalog/tmb-silver.png', 'image/png', 512, 512, 1, 1, 'Project Drive', 'Original catalog illustration', '2026-09-21T00:00:00.000Z');
