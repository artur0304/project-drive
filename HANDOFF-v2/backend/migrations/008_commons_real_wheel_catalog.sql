-- Real, named wheel designs imported from Wikimedia Commons. Every image was
-- admitted by the discovery script only after its per-file license passed the
-- commercial-reuse allowlist. ATTRIBUTION.json preserves the full metadata.
INSERT OR IGNORE INTO wheel_catalog_sources
  (id, slug, name, base_url, terms_url, usage_status, rights_basis, contact_email, notes, created_at, updated_at)
VALUES
  ('source-wikimedia-commons', 'wikimedia-commons', 'Wikimedia Commons',
   'https://commons.wikimedia.org/wiki/Category:Alloy_wheels',
   'https://commons.wikimedia.org/wiki/Commons:Reusing_content_outside_Wikimedia',
   'approved', 'Per-file CC/Public Domain metadata; commercial licenses are allowlisted by the importer.',
   NULL, 'Local derivatives retain author, source page and license in public/wheel-catalog/commons/ATTRIBUTION.json.',
   '2026-09-25T00:00:00.000Z', '2026-09-25T00:00:00.000Z');

INSERT OR IGNORE INTO wheel_brands (id, slug, name, is_oem, visible, created_at) VALUES ('brand-commons-aez', 'aez', 'AEZ', 0, 1, '2026-09-25T00:00:00.000Z');
INSERT OR IGNORE INTO wheel_brands (id, slug, name, is_oem, visible, created_at) VALUES ('brand-commons-ats', 'ats', 'ATS', 0, 1, '2026-09-25T00:00:00.000Z');
INSERT OR IGNORE INTO wheel_brands (id, slug, name, is_oem, visible, created_at) VALUES ('brand-commons-brabus', 'brabus', 'BRABUS', 0, 1, '2026-09-25T00:00:00.000Z');
INSERT OR IGNORE INTO wheel_brands (id, slug, name, is_oem, visible, created_at) VALUES ('brand-commons-borbet', 'borbet', 'BORBET', 0, 1, '2026-09-25T00:00:00.000Z');
INSERT OR IGNORE INTO wheel_brands (id, slug, name, is_oem, visible, created_at) VALUES ('brand-bbs', 'bbs', 'BBS', 0, 1, '2026-09-25T00:00:00.000Z');
INSERT OR IGNORE INTO wheel_brands (id, slug, name, is_oem, visible, created_at) VALUES ('brand-commons-hoshino-racing', 'hoshino-racing', 'Hoshino Racing', 0, 1, '2026-09-25T00:00:00.000Z');
INSERT OR IGNORE INTO wheel_brands (id, slug, name, is_oem, visible, created_at) VALUES ('brand-commons-work', 'work', 'WORK', 0, 1, '2026-09-25T00:00:00.000Z');
INSERT OR IGNORE INTO wheel_brands (id, slug, name, is_oem, visible, created_at) VALUES ('brand-commons-oz-racing', 'oz-racing', 'OZ Racing', 0, 1, '2026-09-25T00:00:00.000Z');
INSERT OR IGNORE INTO wheel_brands (id, slug, name, is_oem, visible, created_at) VALUES ('brand-commons-dotz', 'dotz', 'DOTZ', 0, 1, '2026-09-25T00:00:00.000Z');
INSERT OR IGNORE INTO wheel_brands (id, slug, name, is_oem, visible, created_at) VALUES ('brand-commons-rays', 'rays', 'RAYS', 0, 1, '2026-09-25T00:00:00.000Z');
INSERT OR IGNORE INTO wheel_brands (id, slug, name, is_oem, visible, created_at) VALUES ('brand-commons-porsche', 'porsche', 'Porsche', 1, 1, '2026-09-25T00:00:00.000Z');

INSERT OR IGNORE INTO wheel_models
  (id, brand_id, slug, name, supplier, price_cents, affiliate_link, popularity, image_rights_source, image_rights_basis, visible, created_at, prompt_fragment, source_id, external_id, source_url, category, wheel_type, country_of_origin)
VALUES
  ('model-commons-aez-valencia-d', 'brand-commons-aez', 'aez-valencia-d', 'Valencia D', NULL, NULL, NULL, 220,
   'Wikimedia Commons', 'CC BY 3.0; photo: JamesGrayWheelwright', 1, '2026-09-25T00:00:00.000Z',
   'multi spoke wheel in silver / black with machined finish, matching the supplied reference photograph exactly',
   'source-wikimedia-commons', 'AEZValenciaD.tif', 'https://commons.wikimedia.org/wiki/File%3AAEZValenciaD.tif', 'aftermarket', NULL, NULL);
INSERT OR IGNORE INTO wheel_variants
  (id, model_id, size_label, diameter, color, finish, bolt_pattern, offset, center_bore, visible, created_at, spoke_style, width, sku, stock_status, source_price_cents, source_currency)
VALUES
  ('wheel-commons-aez-valencia-d', 'model-commons-aez-valencia-d', 'Reference photo', 0, 'Silver / black', 'Machined', NULL, NULL, NULL, 1, '2026-09-25T00:00:00.000Z', 'multi_spoke', NULL, NULL, 'reference_only', NULL, NULL);
INSERT OR IGNORE INTO wheel_reference_images
  (id, variant_id, angle, url, mime_type, width, height, has_alpha, is_primary, rights_source, rights_basis, created_at, fal_url, fal_uploaded_at, watermark_free_confirmed)
VALUES
  ('ref-commons-aez-valencia-d', 'wheel-commons-aez-valencia-d', 'front', '/wheel-catalog/commons/aez-valencia-d.webp', 'image/webp', 1000, 1000, 0, 1,
   'Wikimedia Commons — JamesGrayWheelwright', 'CC BY 3.0; derivative: square WebP on beige canvas; source: https://commons.wikimedia.org/wiki/File%3AAEZValenciaD.tif',
   '2026-09-25T00:00:00.000Z', NULL, NULL, 1);

INSERT OR IGNORE INTO wheel_models
  (id, brand_id, slug, name, supplier, price_cents, affiliate_link, popularity, image_rights_source, image_rights_basis, visible, created_at, prompt_fragment, source_id, external_id, source_url, category, wheel_type, country_of_origin)
VALUES
  ('model-commons-ats-amg-penta', 'brand-commons-ats', 'ats-amg-penta', 'AMG Penta', NULL, NULL, NULL, 219,
   'Wikimedia Commons', 'Public domain; photo: Relaxatiallc', 1, '2026-09-25T00:00:00.000Z',
   '5 spoke wheel in black with polished lip finish, matching the supplied reference photograph exactly',
   'source-wikimedia-commons', 'Ats amgpenta.jpg', 'https://commons.wikimedia.org/wiki/File%3AAts_amgpenta.jpg', 'aftermarket', NULL, NULL);
INSERT OR IGNORE INTO wheel_variants
  (id, model_id, size_label, diameter, color, finish, bolt_pattern, offset, center_bore, visible, created_at, spoke_style, width, sku, stock_status, source_price_cents, source_currency)
VALUES
  ('wheel-commons-ats-amg-penta', 'model-commons-ats-amg-penta', 'Reference photo', 0, 'Black', 'Polished lip', NULL, NULL, NULL, 1, '2026-09-25T00:00:00.000Z', '5_spoke', NULL, NULL, 'reference_only', NULL, NULL);
INSERT OR IGNORE INTO wheel_reference_images
  (id, variant_id, angle, url, mime_type, width, height, has_alpha, is_primary, rights_source, rights_basis, created_at, fal_url, fal_uploaded_at, watermark_free_confirmed)
VALUES
  ('ref-commons-ats-amg-penta', 'wheel-commons-ats-amg-penta', 'front', '/wheel-catalog/commons/ats-amg-penta.webp', 'image/webp', 1000, 1000, 0, 1,
   'Wikimedia Commons — Relaxatiallc', 'Public domain; derivative: square WebP on beige canvas; source: https://commons.wikimedia.org/wiki/File%3AAts_amgpenta.jpg',
   '2026-09-25T00:00:00.000Z', NULL, NULL, 1);

INSERT OR IGNORE INTO wheel_models
  (id, brand_id, slug, name, supplier, price_cents, affiliate_link, popularity, image_rights_source, image_rights_basis, visible, created_at, prompt_fragment, source_id, external_id, source_url, category, wheel_type, country_of_origin)
VALUES
  ('model-commons-brabus-monoblock', 'brand-commons-brabus', 'brabus-monoblock', 'Top Marques 2019 exhibit', NULL, NULL, NULL, 218,
   'Wikimedia Commons', 'CC BY-SA 4.0; photo: Alexander Migl', 1, '2026-09-25T00:00:00.000Z',
   'monoblock wheel in silver with machined finish, matching the supplied reference photograph exactly',
   'source-wikimedia-commons', 'Brabus Rim Top Marques 2019 IMG 1123.jpg', 'https://commons.wikimedia.org/wiki/File%3ABrabus_Rim_Top_Marques_2019_IMG_1123.jpg', 'aftermarket', NULL, NULL);
INSERT OR IGNORE INTO wheel_variants
  (id, model_id, size_label, diameter, color, finish, bolt_pattern, offset, center_bore, visible, created_at, spoke_style, width, sku, stock_status, source_price_cents, source_currency)
VALUES
  ('wheel-commons-brabus-monoblock', 'model-commons-brabus-monoblock', 'Reference photo', 0, 'Silver', 'Machined', NULL, NULL, NULL, 1, '2026-09-25T00:00:00.000Z', 'monoblock', NULL, NULL, 'reference_only', NULL, NULL);
INSERT OR IGNORE INTO wheel_reference_images
  (id, variant_id, angle, url, mime_type, width, height, has_alpha, is_primary, rights_source, rights_basis, created_at, fal_url, fal_uploaded_at, watermark_free_confirmed)
VALUES
  ('ref-commons-brabus-monoblock', 'wheel-commons-brabus-monoblock', 'front', '/wheel-catalog/commons/brabus-monoblock.webp', 'image/webp', 1000, 1000, 0, 1,
   'Wikimedia Commons — Alexander Migl', 'CC BY-SA 4.0; derivative: square WebP on beige canvas; source: https://commons.wikimedia.org/wiki/File%3ABrabus_Rim_Top_Marques_2019_IMG_1123.jpg',
   '2026-09-25T00:00:00.000Z', NULL, NULL, 1);

INSERT OR IGNORE INTO wheel_models
  (id, brand_id, slug, name, supplier, price_cents, affiliate_link, popularity, image_rights_source, image_rights_basis, visible, created_at, prompt_fragment, source_id, external_id, source_url, category, wheel_type, country_of_origin)
VALUES
  ('model-commons-borbet-tuning-world', 'brand-commons-borbet', 'borbet-tuning-world', 'Tuning World exhibit', NULL, NULL, NULL, 217,
   'Wikimedia Commons', 'CC BY-SA 3.0 de; photo: Hilarmont', 1, '2026-09-25T00:00:00.000Z',
   'multi piece wheel in silver with polished finish, matching the supplied reference photograph exactly',
   'source-wikimedia-commons', 'Felge Borbet Tuning World (Foto Hilarmont).JPG', 'https://commons.wikimedia.org/wiki/File%3AFelge_Borbet_Tuning_World_(Foto_Hilarmont).JPG', 'aftermarket', NULL, NULL);
INSERT OR IGNORE INTO wheel_variants
  (id, model_id, size_label, diameter, color, finish, bolt_pattern, offset, center_bore, visible, created_at, spoke_style, width, sku, stock_status, source_price_cents, source_currency)
VALUES
  ('wheel-commons-borbet-tuning-world', 'model-commons-borbet-tuning-world', 'Reference photo', 0, 'Silver', 'Polished', NULL, NULL, NULL, 1, '2026-09-25T00:00:00.000Z', 'multi_piece', NULL, NULL, 'reference_only', NULL, NULL);
INSERT OR IGNORE INTO wheel_reference_images
  (id, variant_id, angle, url, mime_type, width, height, has_alpha, is_primary, rights_source, rights_basis, created_at, fal_url, fal_uploaded_at, watermark_free_confirmed)
VALUES
  ('ref-commons-borbet-tuning-world', 'wheel-commons-borbet-tuning-world', 'front', '/wheel-catalog/commons/borbet-tuning-world.webp', 'image/webp', 1000, 1000, 0, 1,
   'Wikimedia Commons — Hilarmont', 'CC BY-SA 3.0 de; derivative: square WebP on beige canvas; source: https://commons.wikimedia.org/wiki/File%3AFelge_Borbet_Tuning_World_(Foto_Hilarmont).JPG',
   '2026-09-25T00:00:00.000Z', NULL, NULL, 1);

INSERT OR IGNORE INTO wheel_models
  (id, brand_id, slug, name, supplier, price_cents, affiliate_link, popularity, image_rights_source, image_rights_basis, visible, created_at, prompt_fragment, source_id, external_id, source_url, category, wheel_type, country_of_origin)
VALUES
  ('model-commons-bbs-rx2', 'brand-bbs', 'bbs-rx2', 'RX II', NULL, NULL, NULL, 216,
   'Wikimedia Commons', 'CC BY-SA 2.0; photo: Vito Ianniello', 1, '2026-09-25T00:00:00.000Z',
   'split spoke wheel in silver with machined finish, matching the supplied reference photograph exactly',
   'source-wikimedia-commons', 'BBS 1999 TypRX2.jpg', 'https://commons.wikimedia.org/wiki/File%3ABBS_1999_TypRX2.jpg', 'aftermarket', NULL, NULL);
INSERT OR IGNORE INTO wheel_variants
  (id, model_id, size_label, diameter, color, finish, bolt_pattern, offset, center_bore, visible, created_at, spoke_style, width, sku, stock_status, source_price_cents, source_currency)
VALUES
  ('wheel-commons-bbs-rx2', 'model-commons-bbs-rx2', 'Reference photo', 0, 'Silver', 'Machined', NULL, NULL, NULL, 1, '2026-09-25T00:00:00.000Z', 'split_spoke', NULL, NULL, 'reference_only', NULL, NULL);
INSERT OR IGNORE INTO wheel_reference_images
  (id, variant_id, angle, url, mime_type, width, height, has_alpha, is_primary, rights_source, rights_basis, created_at, fal_url, fal_uploaded_at, watermark_free_confirmed)
VALUES
  ('ref-commons-bbs-rx2', 'wheel-commons-bbs-rx2', 'front', '/wheel-catalog/commons/bbs-rx2.webp', 'image/webp', 1000, 1000, 0, 1,
   'Wikimedia Commons — Vito Ianniello', 'CC BY-SA 2.0; derivative: square WebP on beige canvas; source: https://commons.wikimedia.org/wiki/File%3ABBS_1999_TypRX2.jpg',
   '2026-09-25T00:00:00.000Z', NULL, NULL, 1);

INSERT OR IGNORE INTO wheel_models
  (id, brand_id, slug, name, supplier, price_cents, affiliate_link, popularity, image_rights_source, image_rights_basis, visible, created_at, prompt_fragment, source_id, external_id, source_url, category, wheel_type, country_of_origin)
VALUES
  ('model-commons-bbs-rs764', 'brand-bbs', 'bbs-rs764', 'RS 764', NULL, NULL, NULL, 215,
   'Wikimedia Commons', 'CC BY-SA 3.0; photo: James Hipwell Photography', 1, '2026-09-25T00:00:00.000Z',
   'mesh wheel in silver with painted finish, matching the supplied reference photograph exactly',
   'source-wikimedia-commons', 'BBS RS764.JPG', 'https://commons.wikimedia.org/wiki/File%3ABBS_RS764.JPG', 'aftermarket', NULL, NULL);
INSERT OR IGNORE INTO wheel_variants
  (id, model_id, size_label, diameter, color, finish, bolt_pattern, offset, center_bore, visible, created_at, spoke_style, width, sku, stock_status, source_price_cents, source_currency)
VALUES
  ('wheel-commons-bbs-rs764', 'model-commons-bbs-rs764', 'Reference photo', 0, 'Silver', 'Painted', NULL, NULL, NULL, 1, '2026-09-25T00:00:00.000Z', 'mesh', NULL, NULL, 'reference_only', NULL, NULL);
INSERT OR IGNORE INTO wheel_reference_images
  (id, variant_id, angle, url, mime_type, width, height, has_alpha, is_primary, rights_source, rights_basis, created_at, fal_url, fal_uploaded_at, watermark_free_confirmed)
VALUES
  ('ref-commons-bbs-rs764', 'wheel-commons-bbs-rs764', 'front', '/wheel-catalog/commons/bbs-rs764.webp', 'image/webp', 1000, 1000, 0, 1,
   'Wikimedia Commons — James Hipwell Photography', 'CC BY-SA 3.0; derivative: square WebP on beige canvas; source: https://commons.wikimedia.org/wiki/File%3ABBS_RS764.JPG',
   '2026-09-25T00:00:00.000Z', NULL, NULL, 1);

INSERT OR IGNORE INTO wheel_models
  (id, brand_id, slug, name, supplier, price_cents, affiliate_link, popularity, image_rights_source, image_rights_basis, visible, created_at, prompt_fragment, source_id, external_id, source_url, category, wheel_type, country_of_origin)
VALUES
  ('model-commons-impul-d01', 'brand-commons-hoshino-racing', 'impul-d01', 'Impul D-01', NULL, NULL, NULL, 214,
   'Wikimedia Commons', 'CC0; photo: Sasa21', 1, '2026-09-25T00:00:00.000Z',
   'aero disc wheel in white / black with polished lip finish, matching the supplied reference photograph exactly',
   'source-wikimedia-commons', 'Hoshinoracing impul d 01 wheel.jpg', 'https://commons.wikimedia.org/wiki/File%3AHoshinoracing_impul_d_01_wheel.jpg', 'aftermarket', NULL, NULL);
INSERT OR IGNORE INTO wheel_variants
  (id, model_id, size_label, diameter, color, finish, bolt_pattern, offset, center_bore, visible, created_at, spoke_style, width, sku, stock_status, source_price_cents, source_currency)
VALUES
  ('wheel-commons-impul-d01', 'model-commons-impul-d01', 'Reference photo', 0, 'White / black', 'Polished lip', NULL, NULL, NULL, 1, '2026-09-25T00:00:00.000Z', 'aero_disc', NULL, NULL, 'reference_only', NULL, NULL);
INSERT OR IGNORE INTO wheel_reference_images
  (id, variant_id, angle, url, mime_type, width, height, has_alpha, is_primary, rights_source, rights_basis, created_at, fal_url, fal_uploaded_at, watermark_free_confirmed)
VALUES
  ('ref-commons-impul-d01', 'wheel-commons-impul-d01', 'front', '/wheel-catalog/commons/impul-d01.webp', 'image/webp', 1000, 1000, 0, 1,
   'Wikimedia Commons — Sasa21', 'CC0; derivative: square WebP on beige canvas; source: https://commons.wikimedia.org/wiki/File%3AHoshinoracing_impul_d_01_wheel.jpg',
   '2026-09-25T00:00:00.000Z', NULL, NULL, 1);

INSERT OR IGNORE INTO wheel_models
  (id, brand_id, slug, name, supplier, price_cents, affiliate_link, popularity, image_rights_source, image_rights_basis, visible, created_at, prompt_fragment, source_id, external_id, source_url, category, wheel_type, country_of_origin)
VALUES
  ('model-commons-work-equip-04', 'brand-commons-work', 'work-equip-04', 'Equip 04', NULL, NULL, NULL, 213,
   'Wikimedia Commons', 'CC BY-SA 3.0; photo: JadenNZ', 1, '2026-09-25T00:00:00.000Z',
   '4 spoke wheel in bronze with polished lip finish, matching the supplied reference photograph exactly',
   'source-wikimedia-commons', 'Workequip04.png', 'https://commons.wikimedia.org/wiki/File%3AWorkequip04.png', 'aftermarket', NULL, NULL);
INSERT OR IGNORE INTO wheel_variants
  (id, model_id, size_label, diameter, color, finish, bolt_pattern, offset, center_bore, visible, created_at, spoke_style, width, sku, stock_status, source_price_cents, source_currency)
VALUES
  ('wheel-commons-work-equip-04', 'model-commons-work-equip-04', 'Reference photo', 0, 'Bronze', 'Polished lip', NULL, NULL, NULL, 1, '2026-09-25T00:00:00.000Z', '4_spoke', NULL, NULL, 'reference_only', NULL, NULL);
INSERT OR IGNORE INTO wheel_reference_images
  (id, variant_id, angle, url, mime_type, width, height, has_alpha, is_primary, rights_source, rights_basis, created_at, fal_url, fal_uploaded_at, watermark_free_confirmed)
VALUES
  ('ref-commons-work-equip-04', 'wheel-commons-work-equip-04', 'front', '/wheel-catalog/commons/work-equip-04.webp', 'image/webp', 1000, 1000, 0, 1,
   'Wikimedia Commons — JadenNZ', 'CC BY-SA 3.0; derivative: square WebP on beige canvas; source: https://commons.wikimedia.org/wiki/File%3AWorkequip04.png',
   '2026-09-25T00:00:00.000Z', NULL, NULL, 1);

INSERT OR IGNORE INTO wheel_models
  (id, brand_id, slug, name, supplier, price_cents, affiliate_link, popularity, image_rights_source, image_rights_basis, visible, created_at, prompt_fragment, source_id, external_id, source_url, category, wheel_type, country_of_origin)
VALUES
  ('model-commons-oz-35-anniversary', 'brand-commons-oz-racing', 'oz-35-anniversary', '35 Anniversary', NULL, NULL, NULL, 212,
   'Wikimedia Commons', 'CC BY-SA 3.0; photo: OZ', 1, '2026-09-25T00:00:00.000Z',
   'multi spoke wheel in black / silver with machined finish, matching the supplied reference photograph exactly',
   'source-wikimedia-commons', 'OZ35Anniversary.jpg', 'https://commons.wikimedia.org/wiki/File%3AOZ35Anniversary.jpg', 'aftermarket', NULL, NULL);
INSERT OR IGNORE INTO wheel_variants
  (id, model_id, size_label, diameter, color, finish, bolt_pattern, offset, center_bore, visible, created_at, spoke_style, width, sku, stock_status, source_price_cents, source_currency)
VALUES
  ('wheel-commons-oz-35-anniversary', 'model-commons-oz-35-anniversary', 'Reference photo', 0, 'Black / silver', 'Machined', NULL, NULL, NULL, 1, '2026-09-25T00:00:00.000Z', 'multi_spoke', NULL, NULL, 'reference_only', NULL, NULL);
INSERT OR IGNORE INTO wheel_reference_images
  (id, variant_id, angle, url, mime_type, width, height, has_alpha, is_primary, rights_source, rights_basis, created_at, fal_url, fal_uploaded_at, watermark_free_confirmed)
VALUES
  ('ref-commons-oz-35-anniversary', 'wheel-commons-oz-35-anniversary', 'front', '/wheel-catalog/commons/oz-35-anniversary.webp', 'image/webp', 1000, 1000, 0, 1,
   'Wikimedia Commons — OZ', 'CC BY-SA 3.0; derivative: square WebP on beige canvas; source: https://commons.wikimedia.org/wiki/File%3AOZ35Anniversary.jpg',
   '2026-09-25T00:00:00.000Z', NULL, NULL, 1);

INSERT OR IGNORE INTO wheel_models
  (id, brand_id, slug, name, supplier, price_cents, affiliate_link, popularity, image_rights_source, image_rights_basis, visible, created_at, prompt_fragment, source_id, external_id, source_url, category, wheel_type, country_of_origin)
VALUES
  ('model-commons-dotz-mugello', 'brand-commons-dotz', 'dotz-mugello', 'Mugello', NULL, NULL, NULL, 211,
   'Wikimedia Commons', 'CC BY 3.0; photo: JamesGrayWheelwright', 1, '2026-09-25T00:00:00.000Z',
   'split 5 spoke wheel in black / red with machined finish, matching the supplied reference photograph exactly',
   'source-wikimedia-commons', 'DOTZMugelloLake30.jpg', 'https://commons.wikimedia.org/wiki/File%3ADOTZMugelloLake30.jpg', 'aftermarket', NULL, NULL);
INSERT OR IGNORE INTO wheel_variants
  (id, model_id, size_label, diameter, color, finish, bolt_pattern, offset, center_bore, visible, created_at, spoke_style, width, sku, stock_status, source_price_cents, source_currency)
VALUES
  ('wheel-commons-dotz-mugello', 'model-commons-dotz-mugello', 'Reference photo', 0, 'Black / red', 'Machined', NULL, NULL, NULL, 1, '2026-09-25T00:00:00.000Z', 'split_5_spoke', NULL, NULL, 'reference_only', NULL, NULL);
INSERT OR IGNORE INTO wheel_reference_images
  (id, variant_id, angle, url, mime_type, width, height, has_alpha, is_primary, rights_source, rights_basis, created_at, fal_url, fal_uploaded_at, watermark_free_confirmed)
VALUES
  ('ref-commons-dotz-mugello', 'wheel-commons-dotz-mugello', 'front', '/wheel-catalog/commons/dotz-mugello.webp', 'image/webp', 1000, 1000, 0, 1,
   'Wikimedia Commons — JamesGrayWheelwright', 'CC BY 3.0; derivative: square WebP on beige canvas; source: https://commons.wikimedia.org/wiki/File%3ADOTZMugelloLake30.jpg',
   '2026-09-25T00:00:00.000Z', NULL, NULL, 1);

INSERT OR IGNORE INTO wheel_models
  (id, brand_id, slug, name, supplier, price_cents, affiliate_link, popularity, image_rights_source, image_rights_basis, visible, created_at, prompt_fragment, source_id, external_id, source_url, category, wheel_type, country_of_origin)
VALUES
  ('model-commons-rays-f1-front', 'brand-commons-rays', 'rays-f1-front', 'F1 Front', NULL, NULL, NULL, 210,
   'Wikimedia Commons', 'Public domain; photo: Hatsukari715', 1, '2026-09-25T00:00:00.000Z',
   'motorsport wheel in gunmetal with satin finish, matching the supplied reference photograph exactly',
   'source-wikimedia-commons', 'Rays F1 Front Wheel.JPG', 'https://commons.wikimedia.org/wiki/File%3ARays_F1_Front_Wheel.JPG', 'aftermarket', NULL, NULL);
INSERT OR IGNORE INTO wheel_variants
  (id, model_id, size_label, diameter, color, finish, bolt_pattern, offset, center_bore, visible, created_at, spoke_style, width, sku, stock_status, source_price_cents, source_currency)
VALUES
  ('wheel-commons-rays-f1-front', 'model-commons-rays-f1-front', 'Reference photo', 0, 'Gunmetal', 'Satin', NULL, NULL, NULL, 1, '2026-09-25T00:00:00.000Z', 'motorsport', NULL, NULL, 'reference_only', NULL, NULL);
INSERT OR IGNORE INTO wheel_reference_images
  (id, variant_id, angle, url, mime_type, width, height, has_alpha, is_primary, rights_source, rights_basis, created_at, fal_url, fal_uploaded_at, watermark_free_confirmed)
VALUES
  ('ref-commons-rays-f1-front', 'wheel-commons-rays-f1-front', 'front', '/wheel-catalog/commons/rays-f1-front.webp', 'image/webp', 1000, 1000, 0, 1,
   'Wikimedia Commons — Hatsukari715', 'Public domain; derivative: square WebP on beige canvas; source: https://commons.wikimedia.org/wiki/File%3ARays_F1_Front_Wheel.JPG',
   '2026-09-25T00:00:00.000Z', NULL, NULL, 1);

INSERT OR IGNORE INTO wheel_models
  (id, brand_id, slug, name, supplier, price_cents, affiliate_link, popularity, image_rights_source, image_rights_basis, visible, created_at, prompt_fragment, source_id, external_id, source_url, category, wheel_type, country_of_origin)
VALUES
  ('model-commons-porsche-997-carrera-4s', 'brand-commons-porsche', 'porsche-997-carrera-4s', '997 Carrera 4S', NULL, NULL, NULL, 209,
   'Wikimedia Commons', 'CC BY 2.0; photo: sanjoyg', 1, '2026-09-25T00:00:00.000Z',
   'oem sport wheel in silver with machined finish, matching the supplied reference photograph exactly',
   'source-wikimedia-commons', 'Porsche 911 (997) Carrera 4S Wheel.jpg', 'https://commons.wikimedia.org/wiki/File%3APorsche_911_(997)_Carrera_4S_Wheel.jpg', 'oem', NULL, NULL);
INSERT OR IGNORE INTO wheel_variants
  (id, model_id, size_label, diameter, color, finish, bolt_pattern, offset, center_bore, visible, created_at, spoke_style, width, sku, stock_status, source_price_cents, source_currency)
VALUES
  ('wheel-commons-porsche-997-carrera-4s', 'model-commons-porsche-997-carrera-4s', 'Reference photo', 0, 'Silver', 'Machined', NULL, NULL, NULL, 1, '2026-09-25T00:00:00.000Z', 'oem_sport', NULL, NULL, 'reference_only', NULL, NULL);
INSERT OR IGNORE INTO wheel_reference_images
  (id, variant_id, angle, url, mime_type, width, height, has_alpha, is_primary, rights_source, rights_basis, created_at, fal_url, fal_uploaded_at, watermark_free_confirmed)
VALUES
  ('ref-commons-porsche-997-carrera-4s', 'wheel-commons-porsche-997-carrera-4s', 'front', '/wheel-catalog/commons/porsche-997-carrera-4s.webp', 'image/webp', 1000, 1000, 0, 1,
   'Wikimedia Commons — sanjoyg', 'CC BY 2.0; derivative: square WebP on beige canvas; source: https://commons.wikimedia.org/wiki/File%3APorsche_911_(997)_Carrera_4S_Wheel.jpg',
   '2026-09-25T00:00:00.000Z', NULL, NULL, 1);
