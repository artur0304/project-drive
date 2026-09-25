/**
 * Finds real wheel photographs on Wikimedia Commons and records the exact
 * author/license/source for every candidate. This script never imports files
 * with a non-commercial or unknown license.
 *
 * Usage:
 *   node scripts/commons-wheel-discovery.mjs
 */
import { writeFile, mkdir } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

const API = 'https://commons.wikimedia.org/w/api.php';
const here = path.dirname(fileURLToPath(import.meta.url));
const outputDir = path.resolve(here, '../data');
await mkdir(outputDir, { recursive: true });

if (process.argv.includes('--list-brands')) {
  const url = new URL(API);
  url.search = new URLSearchParams({ format: 'json', origin: '*', action: 'query', list: 'categorymembers', cmtitle: 'Category:Alloy wheels by brand', cmtype: 'subcat', cmlimit: '500' });
  const result = await fetch(url, { headers: { 'user-agent': 'ProjectDrive/0.1 wheel-catalog research' } }).then((response) => response.json());
  const brandCategories = result.query.categorymembers.map((item) => item.title);
  await writeFile(path.join(outputDir, 'commons-wheel-brand-categories.json'), `${JSON.stringify(brandCategories, null, 2)}\n`);
  console.log(`Saved ${brandCategories.length} wheel-brand categories.`);
  process.exit(0);
}

const categories = [
  'Category:Alloy wheels without tires',
  'Category:BBS alloy wheels without tires',
  'Category:Multi-piece alloy wheels',
  'Category:OZ Racing wheels',
];

if (process.argv.includes('--expanded')) categories.push(...[
  'Category:AEZ alloy wheels', 'Category:American Racing alloy wheels',
  'Category:Asanti alloy wheels', 'Category:ATS alloy wheels',
  'Category:Black Rhino alloy wheels', 'Category:Borbet alloy wheels',
  'Category:Brock alloy wheels', 'Category:Dezent alloy wheels',
  'Category:Dotz alloy wheels', 'Category:Enkei alloy wheels',
  'Category:Forgestar alloy wheels', 'Category:Fuchs alloy wheels',
  'Category:HRE alloy wheels', 'Category:KESKIN alloy wheels',
  'Category:Lexani alloy wheels', 'Category:MAK alloy wheels',
  'Category:MAM alloy wheels', 'Category:Prodrive alloy wheels',
  'Category:RAYS alloy wheels', 'Category:Rial alloy wheels',
  'Category:Ronal alloy wheels', 'Category:Rotiform alloy wheels',
  'Category:Volk Racing alloy wheels', 'Category:Vossen alloy wheels',
  'Category:WELD alloy wheels', 'Category:Work alloy wheels',
  'Category:BMW alloy wheels', 'Category:Audi alloy wheels',
  'Category:Mercedes-Benz alloy wheels', 'Category:Porsche alloy wheels',
  'Category:Ferrari alloy wheels', 'Category:Lamborghini alloy wheels',
]);

const allowedLicenses = [
  'cc0', 'public domain', 'cc by 1.0', 'cc by 2.0', 'cc by 2.5',
  'cc by 3.0', 'cc by 4.0', 'cc by-sa 1.0', 'cc by-sa 2.0',
  'cc by-sa 2.5', 'cc by-sa 3.0', 'cc by-sa 4.0',
];

async function api(params) {
  const url = new URL(API);
  for (const [key, value] of Object.entries({ format: 'json', origin: '*', ...params })) {
    url.searchParams.set(key, value);
  }
  for (let attempt = 0; attempt < 5; attempt += 1) {
    const response = await fetch(url, { headers: { 'user-agent': 'ProjectDrive/0.1 wheel-catalog research' } });
    if (response.ok) return response.json();
    if (response.status !== 429 || attempt === 4) throw new Error(`Commons API ${response.status}: ${url}`);
    await new Promise((resolve) => setTimeout(resolve, 2000 * (attempt + 1)));
  }
  throw new Error(`Commons API did not answer: ${url}`);
}

async function categoryFiles(category) {
  const files = [];
  let cmcontinue;
  do {
    const result = await api({
      action: 'query', list: 'categorymembers', cmtitle: category,
      cmnamespace: '6', cmlimit: '500', ...(cmcontinue ? { cmcontinue } : {}),
    });
    files.push(...result.query.categorymembers.map((item) => item.title));
    cmcontinue = result.continue?.cmcontinue;
  } while (cmcontinue);
  return files;
}

function cleanHtml(value = '') {
  return value.replace(/<[^>]+>/g, ' ').replace(/&nbsp;/g, ' ').replace(/\s+/g, ' ').trim();
}

function commercialLicense(name = '') {
  const normalized = name.toLowerCase().replace(/creative commons/g, 'cc').replace(/attribution-sharealike/g, 'by-sa').replace(/attribution/g, 'by');
  return allowedLicenses.some((license) => normalized.includes(license));
}

async function metadata(titles) {
  const output = [];
  for (let index = 0; index < titles.length; index += 50) {
    const result = await api({
      action: 'query', prop: 'imageinfo', titles: titles.slice(index, index + 50).join('|'),
      iiprop: 'url|size|mime|extmetadata', iiurlwidth: '1200',
    });
    for (const page of Object.values(result.query.pages)) {
      const info = page.imageinfo?.[0];
      if (!info) continue;
      const meta = info.extmetadata || {};
      const license = cleanHtml(meta.LicenseShortName?.value || meta.UsageTerms?.value || '');
      output.push({
        title: page.title.replace(/^File:/, ''),
        description: cleanHtml(meta.ImageDescription?.value || ''),
        artist: cleanHtml(meta.Artist?.value || 'Unknown'),
        credit: cleanHtml(meta.Credit?.value || ''),
        license,
        licenseUrl: meta.LicenseUrl?.value || '',
        sourcePage: meta.DescriptionUrl?.value || `https://commons.wikimedia.org/wiki/${encodeURIComponent(page.title.replace(/ /g, '_'))}`,
        originalUrl: info.url,
        previewUrl: info.thumburl || info.url,
        width: info.width,
        height: info.height,
        mime: info.mime,
        commerciallyReusable: commercialLicense(license),
      });
    }
  }
  return output;
}

const all = new Map();
  for (const category of categories) {
  const titles = await categoryFiles(category);
  for (const title of titles) {
    if (!all.has(title)) all.set(title, { title, categories: [] });
    all.get(title).categories.push(category);
  }
  if (process.argv.includes('--expanded')) await new Promise((resolve) => setTimeout(resolve, 350));
}

const details = await metadata([...all.keys()]);
const candidates = details
  .map((item) => ({ ...item, categories: all.get(`File:${item.title}`)?.categories || [] }))
  .filter((item) => item.commerciallyReusable && item.width >= 700 && item.height >= 700)
  .sort((a, b) => Math.min(b.width, b.height) - Math.min(a.width, a.height));

const outputName = process.argv.includes('--expanded') ? 'commons-wheel-expanded-candidates.json' : 'commons-wheel-candidates.json';
await writeFile(path.join(outputDir, outputName), `${JSON.stringify(candidates, null, 2)}\n`);
console.log(`Saved ${candidates.length} commercially reusable candidates from ${details.length} files.`);
