/**
 * Imports a deliberately varied set of real wheel photographs from Wikimedia
 * Commons. Source metadata comes from commons-wheel-discovery.mjs; attribution
 * stays beside the derivative assets in ATTRIBUTION.json.
 */
import { readFile, writeFile, mkdir, access } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import path from 'node:path';
import sharp from 'sharp';

const selection = [
  { title: 'AEZValenciaD.tif', slug: 'aez-valencia-d', brand: 'AEZ', model: 'Valencia D', style: 'multi_spoke', color: 'Silver / black', finish: 'Machined' },
  { title: 'Ats amgpenta.jpg', slug: 'ats-amg-penta', brand: 'ATS', model: 'AMG Penta', style: '5_spoke', color: 'Black', finish: 'Polished lip' },
  { title: 'Brabus Rim Top Marques 2019 IMG 1123.jpg', slug: 'brabus-monoblock', brand: 'BRABUS', model: 'Top Marques 2019 exhibit', style: 'monoblock', color: 'Silver', finish: 'Machined' },
  { title: 'Felge Borbet Tuning World (Foto Hilarmont).JPG', slug: 'borbet-tuning-world', brand: 'BORBET', model: 'Tuning World exhibit', style: 'multi_piece', color: 'Silver', finish: 'Polished' },
  { title: 'BBS 1999 TypRX2.jpg', slug: 'bbs-rx2', brand: 'BBS', model: 'RX II', style: 'split_spoke', color: 'Silver', finish: 'Machined' },
  { title: 'BBS RS764.JPG', slug: 'bbs-rs764', brand: 'BBS', model: 'RS 764', style: 'mesh', color: 'Silver', finish: 'Painted' },
  { title: 'Hoshinoracing impul d 01 wheel.jpg', slug: 'impul-d01', brand: 'Hoshino Racing', model: 'Impul D-01', style: 'aero_disc', color: 'White / black', finish: 'Polished lip' },
  { title: 'Workequip04.png', slug: 'work-equip-04', brand: 'WORK', model: 'Equip 04', style: '4_spoke', color: 'Bronze', finish: 'Polished lip' },
  { title: 'OZ35Anniversary.jpg', slug: 'oz-35-anniversary', brand: 'OZ Racing', model: '35 Anniversary', style: 'multi_spoke', color: 'Black / silver', finish: 'Machined' },
  { title: 'DOTZMugelloLake30.jpg', slug: 'dotz-mugello', brand: 'DOTZ', model: 'Mugello', style: 'split_5_spoke', color: 'Black / red', finish: 'Machined' },
  { title: 'Rays F1 Front Wheel.JPG', slug: 'rays-f1-front', brand: 'RAYS', model: 'F1 Front', style: 'motorsport', color: 'Gunmetal', finish: 'Satin' },
  { title: 'Porsche 911 (997) Carrera 4S Wheel.jpg', slug: 'porsche-997-carrera-4s', brand: 'Porsche', model: '997 Carrera 4S', style: 'oem_sport', color: 'Silver', finish: 'Machined' },
];

const here = path.dirname(fileURLToPath(import.meta.url));
const candidatesPath = path.resolve(here, '../data/commons-wheel-candidates.json');
const publicDir = path.resolve(here, '../../web/public/wheel-catalog/commons');
const migrationPath = path.resolve(here, '../migrations/008_commons_real_wheel_catalog.sql');
const candidates = JSON.parse(await readFile(candidatesPath, 'utf8'));
const byTitle = new Map(candidates.map((item) => [item.title, item]));
await mkdir(publicDir, { recursive: true });

const wait = (milliseconds) => new Promise((resolve) => setTimeout(resolve, milliseconds));

async function download(url, title) {
  for (let attempt = 0; attempt < 4; attempt += 1) {
    const response = await fetch(url, { headers: { 'user-agent': 'ProjectDrive/0.1 wheel-catalog import' } });
    if (response.ok) return Buffer.from(await response.arrayBuffer());
    if (response.status !== 429 || attempt === 3) throw new Error(`Download ${response.status}: ${title}`);
    await wait(2500 * (attempt + 1));
  }
  throw new Error(`Download failed: ${title}`);
}

const imported = [];
for (const wheel of selection) {
  const source = byTitle.get(wheel.title);
  if (!source?.commerciallyReusable) throw new Error(`Missing approved metadata: ${wheel.title}`);
  const outputPath = path.join(publicDir, `${wheel.slug}.webp`);
  let alreadyExists = true;
  try { await access(outputPath); } catch { alreadyExists = false; }
  let metadata;
  if (alreadyExists) {
    metadata = await sharp(outputPath).metadata();
  } else {
    const input = await download(source.previewUrl, wheel.title);
    const image = sharp(input, { pages: 1 }).rotate();
    metadata = await image.metadata();
    await image
      .resize(1000, 1000, { fit: 'contain', background: '#e7dfd2', withoutEnlargement: false })
      .flatten({ background: '#e7dfd2' })
      .webp({ quality: 90, effort: 6 })
      .toFile(outputPath);
    await wait(900);
  }
  imported.push({
    ...wheel,
    asset: `/wheel-catalog/commons/${wheel.slug}.webp`,
    derivative: { width: 1000, height: 1000, format: 'webp', background: '#e7dfd2' },
    source: { ...source, downloadedWidth: metadata.width, downloadedHeight: metadata.height },
  });
  console.log(`Imported ${wheel.brand} ${wheel.model}`);
}

await writeFile(path.join(publicDir, 'ATTRIBUTION.json'), `${JSON.stringify(imported, null, 2)}\n`);

const sql = (value) => value == null ? 'NULL' : `'${String(value).replaceAll("'", "''")}'`;
const brandSlug = (brand) => brand.toLowerCase().replaceAll(/[^a-z0-9]+/g, '-').replaceAll(/^-|-$/g, '');
const brandId = (brand) => brand === 'BBS' ? 'brand-bbs' : `brand-commons-${brandSlug(brand)}`;
const createdAt = '2026-09-25T00:00:00.000Z';

const migration = `-- Real, named wheel designs imported from Wikimedia Commons. Every image was\n-- admitted by the discovery script only after its per-file license passed the\n-- commercial-reuse allowlist. ATTRIBUTION.json preserves the full metadata.\nINSERT OR IGNORE INTO wheel_catalog_sources\n  (id, slug, name, base_url, terms_url, usage_status, rights_basis, contact_email, notes, created_at, updated_at)\nVALUES\n  ('source-wikimedia-commons', 'wikimedia-commons', 'Wikimedia Commons',\n   'https://commons.wikimedia.org/wiki/Category:Alloy_wheels',\n   'https://commons.wikimedia.org/wiki/Commons:Reusing_content_outside_Wikimedia',\n   'approved', 'Per-file CC/Public Domain metadata; commercial licenses are allowlisted by the importer.',\n   NULL, 'Local derivatives retain author, source page and license in public/wheel-catalog/commons/ATTRIBUTION.json.',\n   '${createdAt}', '${createdAt}');\n\n${[...new Map(imported.map((item) => [item.brand, item])).values()].map((item) =>
  `INSERT OR IGNORE INTO wheel_brands (id, slug, name, is_oem, visible, created_at) VALUES (${sql(brandId(item.brand))}, ${sql(brandSlug(item.brand))}, ${sql(item.brand)}, ${item.brand === 'Porsche' ? 1 : 0}, 1, '${createdAt}');`
).join('\n')}\n\n${imported.map((item, index) => `INSERT OR IGNORE INTO wheel_models\n  (id, brand_id, slug, name, supplier, price_cents, affiliate_link, popularity, image_rights_source, image_rights_basis, visible, created_at, prompt_fragment, source_id, external_id, source_url, category, wheel_type, country_of_origin)\nVALUES\n  (${sql(`model-commons-${item.slug}`)}, ${sql(brandId(item.brand))}, ${sql(item.slug)}, ${sql(item.model)}, NULL, NULL, NULL, ${220 - index},\n   'Wikimedia Commons', ${sql(`${item.source.license}; photo: ${item.source.artist}`)}, 1, '${createdAt}',\n   ${sql(`${item.style.replaceAll('_', ' ')} wheel in ${item.color.toLowerCase()} with ${item.finish.toLowerCase()} finish, matching the supplied reference photograph exactly`)},\n   'source-wikimedia-commons', ${sql(item.title)}, ${sql(item.source.sourcePage)}, ${sql(item.brand === 'Porsche' ? 'oem' : 'aftermarket')}, NULL, NULL);\nINSERT OR IGNORE INTO wheel_variants\n  (id, model_id, size_label, diameter, color, finish, bolt_pattern, offset, center_bore, visible, created_at, spoke_style, width, sku, stock_status, source_price_cents, source_currency)\nVALUES\n  (${sql(`wheel-commons-${item.slug}`)}, ${sql(`model-commons-${item.slug}`)}, 'Reference photo', 0, ${sql(item.color)}, ${sql(item.finish)}, NULL, NULL, NULL, 1, '${createdAt}', ${sql(item.style)}, NULL, NULL, 'reference_only', NULL, NULL);\nINSERT OR IGNORE INTO wheel_reference_images\n  (id, variant_id, angle, url, mime_type, width, height, has_alpha, is_primary, rights_source, rights_basis, created_at, fal_url, fal_uploaded_at, watermark_free_confirmed)\nVALUES\n  (${sql(`ref-commons-${item.slug}`)}, ${sql(`wheel-commons-${item.slug}`)}, 'front', ${sql(item.asset)}, 'image/webp', 1000, 1000, 0, 1,\n   ${sql(`Wikimedia Commons — ${item.source.artist}`)}, ${sql(`${item.source.license}; derivative: square WebP on beige canvas; source: ${item.source.sourcePage}`)},\n   '${createdAt}', NULL, NULL, 1);`).join('\n\n')}\n`;

await writeFile(migrationPath, migration);
console.log(`Saved ${imported.length} real wheel assets, attribution records and migration 008.`);



