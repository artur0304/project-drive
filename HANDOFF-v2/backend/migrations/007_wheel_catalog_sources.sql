-- Реальный каталог может приходить только из источника, который разрешил
-- коммерческое использование данных и изображений. Эта таблица хранит не
-- просто адрес сайта, а статус разрешения: без approved импорт не запускается.
CREATE TABLE wheel_catalog_sources (
  id TEXT PRIMARY KEY,
  slug TEXT UNIQUE NOT NULL,
  name TEXT NOT NULL,
  base_url TEXT NOT NULL,
  terms_url TEXT,
  usage_status TEXT NOT NULL DEFAULT 'permission_required'
    CHECK (usage_status IN ('permission_required', 'approved', 'revoked')),
  rights_basis TEXT,
  contact_email TEXT,
  notes TEXT,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

-- Этот магазин исследован как возможный источник. Его опубликованные условия
-- разрешают скачивание только для личного использования и запрещают размещать
-- материалы на других сайтах, поэтому статус намеренно НЕ approved.
INSERT INTO wheel_catalog_sources
  (id, slug, name, base_url, terms_url, usage_status, rights_basis, contact_email, notes, created_at, updated_at)
VALUES
  ('source-shiny-diski', 'shiny-diski', 'Шини та Диски',
   'https://shiny-diski.com.ua/uk/wheels',
   'https://shiny-diski.com.ua/uk/page/uslovija-ispolzovanija-sajta',
   'permission_required', NULL, 'info@shiny-diski.com.ua',
   'Около 5000 дисков, 1266 страниц. Нужен письменный фид/лицензия до импорта материалов.',
   '2026-09-25T00:00:00.000Z', '2026-09-25T00:00:00.000Z');

-- Поля происхождения и реальные товарные характеристики. Они nullable, поэтому
-- старый демонстрационный каталог продолжает работать без миграции данных.
ALTER TABLE wheel_models ADD COLUMN source_id TEXT;
ALTER TABLE wheel_models ADD COLUMN external_id TEXT;
ALTER TABLE wheel_models ADD COLUMN source_url TEXT;
ALTER TABLE wheel_models ADD COLUMN category TEXT;
ALTER TABLE wheel_models ADD COLUMN wheel_type TEXT;
ALTER TABLE wheel_models ADD COLUMN country_of_origin TEXT;

ALTER TABLE wheel_variants ADD COLUMN width REAL;
ALTER TABLE wheel_variants ADD COLUMN sku TEXT;
ALTER TABLE wheel_variants ADD COLUMN stock_status TEXT;
ALTER TABLE wheel_variants ADD COLUMN source_price_cents INTEGER;
ALTER TABLE wheel_variants ADD COLUMN source_currency TEXT;

CREATE UNIQUE INDEX idx_wheel_models_source_external
  ON wheel_models(source_id, external_id)
  WHERE source_id IS NOT NULL AND external_id IS NOT NULL;
CREATE INDEX idx_wheel_models_category_type
  ON wheel_models(category, wheel_type, visible);
CREATE INDEX idx_wheel_variants_fitment_extended
  ON wheel_variants(diameter, width, bolt_pattern, offset, center_bore, visible);
