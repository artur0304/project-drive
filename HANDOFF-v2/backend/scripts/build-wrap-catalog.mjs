import sharp from 'sharp';
import { mkdirSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const here = dirname(fileURLToPath(import.meta.url));
const backend = join(here, '..');
const output = join(backend, '..', 'web', 'public', 'wrap-catalog');
const migrationPath = join(backend, 'migrations', '011_expand_wrap_catalog.sql');

const existing = [
  ['jet_black', 'Jet Black', '#161616', 'black'], ['alpine_white', 'Alpine White', '#D9D2C4', 'white'],
  ['stealth_grey', 'Stealth Grey', '#54565C', 'grey'], ['titanium', 'Titanium', '#7A7D82', 'grey'],
  ['deep_navy', 'Deep Navy', '#1B2A4A', 'blue'], ['slate_blue', 'Slate Blue', '#3A4B5C', 'blue'],
  ['racing_green', 'Racing Green', '#284536', 'green'], ['emerald', 'Emerald', '#1F5B46', 'green'],
  ['ember_red', 'Ember Red', '#8F2727', 'red'], ['burgundy', 'Burgundy', '#511F2A', 'red'],
  ['sunburst', 'Sunburst Orange', '#C85E24', 'orange'], ['champagne', 'Champagne', '#B7A377', 'gold'],
  ['bronze', 'Bronze', '#81532D', 'brown'], ['plum', 'Deep Plum', '#493047', 'purple'],
  ['ice_silver', 'Ice Silver', '#AEB3B6', 'silver'], ['copper', 'Copper', '#9C5D32', 'brown'],
];

const added = [
  ['onyx_black', 'Onyx Black', '#0D0E10', 'black'], ['piano_black', 'Piano Black', '#090909', 'black'],
  ['blue_black', 'Blue Black', '#101820', 'black'], ['pure_white', 'Pure White', '#F2F1EB', 'white'],
  ['ivory_white', 'Ivory White', '#E5DDC9', 'white'], ['chalk_white', 'Chalk White', '#C9C4B8', 'white'],
  ['concrete_grey', 'Concrete Grey', '#85878A', 'grey'], ['storm_grey', 'Storm Grey', '#43474D', 'grey'],
  ['anthracite', 'Anthracite', '#30343A', 'grey'], ['battleship_grey', 'Battleship Grey', '#62666B', 'grey'],
  ['liquid_silver', 'Liquid Silver', '#BBC1C5', 'silver'], ['aluminium', 'Aluminium', '#949A9E', 'silver'],
  ['cobalt_blue', 'Cobalt Blue', '#154C9A', 'blue'], ['riviera_blue', 'Riviera Blue', '#32A6D7', 'blue'],
  ['midnight_blue', 'Midnight Blue', '#101D3C', 'blue'], ['petrol_blue', 'Petrol Blue', '#14566A', 'blue'],
  ['forest_green', 'Forest Green', '#183D2C', 'green'], ['olive_green', 'Olive Green', '#596044', 'green'],
  ['khaki_green', 'Khaki Green', '#77735C', 'green'], ['mint_green', 'Mint Green', '#86B8A4', 'green'],
  ['carmine_red', 'Carmine Red', '#B3262D', 'red'], ['rosso_red', 'Rosso Red', '#D12A2E', 'red'],
  ['wine_red', 'Wine Red', '#641D2E', 'red'], ['burnt_orange', 'Burnt Orange', '#B44E1D', 'orange'],
  ['papaya_orange', 'Papaya Orange', '#E66A23', 'orange'], ['signal_yellow', 'Signal Yellow', '#E3B91E', 'yellow'],
  ['mustard_yellow', 'Mustard Yellow', '#B99125', 'yellow'], ['desert_sand', 'Desert Sand', '#B6A27A', 'gold'],
  ['coffee_brown', 'Coffee Brown', '#4C352C', 'brown'], ['midnight_purple', 'Midnight Purple', '#28213E', 'purple'],
  ['lavender', 'Lavender', '#82739F', 'purple'], ['aubergine', 'Aubergine', '#3F263D', 'purple'],
];

const colors = [...existing, ...added];
const finishes = [
  ['gloss', 'Gloss'], ['satin', 'Satin'], ['matte', 'Matte'],
];
const specials = [
  ['deep_navy', 'metallic', 'wrap-deep-navy-metallic'],
  ['ice_silver', 'metallic', 'wrap-ice-silver-metallic'],
  ['champagne', 'pearl', 'wrap-champagne-pearl'],
];

function esc(value) { return `'${String(value).replaceAll("'", "''")}'`; }
function rgb(hex) { return hex.slice(1).match(/../g).map((part) => Number.parseInt(part, 16)); }
function mix(hex, target, amount) {
  const source = rgb(hex); const end = rgb(target);
  return `#${source.map((v, i) => Math.round(v + (end[i] - v) * amount).toString(16).padStart(2, '0')).join('')}`;
}

function materialSvg({ hex, finish }) {
  const light = mix(hex, '#ffffff', finish === 'gloss' ? .48 : .25);
  const shade = mix(hex, '#000000', .52);
  const soft = mix(hex, '#ffffff', .13);
  const roughness = finish === 'matte' ? .26 : finish === 'satin' ? .14 : .05;
  const highlightOpacity = finish === 'gloss' ? .78 : finish === 'satin' ? .34 : .14;
  const highlightWidth = finish === 'gloss' ? 54 : finish === 'satin' ? 118 : 180;
  return `<svg xmlns="http://www.w3.org/2000/svg" width="720" height="440" viewBox="0 0 720 440">
  <defs>
    <linearGradient id="studio" x1="0" y1="0" x2="0" y2="1"><stop stop-color="#e5e3de"/><stop offset="1" stop-color="#b9b8b4"/></linearGradient>
    <linearGradient id="vinyl" x1="0" y1="0" x2="1" y2="1"><stop stop-color="${shade}"/><stop offset=".24" stop-color="${hex}"/><stop offset=".64" stop-color="${soft}"/><stop offset="1" stop-color="${shade}"/></linearGradient>
    <linearGradient id="roll" x1="0" y1="0" x2="1" y2="0"><stop stop-color="${shade}"/><stop offset=".28" stop-color="${hex}"/><stop offset=".58" stop-color="${light}"/><stop offset=".73" stop-color="${hex}"/><stop offset="1" stop-color="${shade}"/></linearGradient>
    <linearGradient id="shine" x1="0" y1="0" x2="1" y2="0"><stop stop-color="#fff" stop-opacity="0"/><stop offset=".5" stop-color="#fff" stop-opacity="${highlightOpacity}"/><stop offset="1" stop-color="#fff" stop-opacity="0"/></linearGradient>
    <filter id="shadow" x="-30%" y="-40%" width="170%" height="200%"><feDropShadow dx="0" dy="20" stdDeviation="18" flood-color="#202125" flood-opacity=".34"/></filter>
    <filter id="grain"><feTurbulence type="fractalNoise" baseFrequency=".7" numOctaves="3" seed="8"/><feComposite operator="in" in2="SourceGraphic"/><feBlend mode="soft-light" in="SourceGraphic"/></filter>
    <clipPath id="sheetClip"><path d="M83 328 L470 118 L635 207 L245 411 Z"/></clipPath>
  </defs>
  <rect width="720" height="440" fill="url(#studio)"/>
  <path d="M0 350 C170 318 310 363 720 300 L720 440 L0 440Z" fill="#aaa9a5" opacity=".34"/>
  <g filter="url(#shadow)">
    <path d="M83 328 L470 118 L635 207 L245 411 Z" fill="url(#vinyl)"/>
    <rect x="${finish === 'gloss' ? 309 : 275}" y="70" width="${highlightWidth}" height="410" rx="26" fill="url(#shine)" transform="rotate(61 360 230)" clip-path="url(#sheetClip)"/>
    <path d="M470 118 C523 83 653 139 635 207 C619 263 500 203 470 118Z" fill="url(#roll)"/>
    <ellipse cx="638" cy="173" rx="42" ry="72" transform="rotate(-61 638 173)" fill="${shade}"/>
    <ellipse cx="638" cy="173" rx="25" ry="48" transform="rotate(-61 638 173)" fill="#e6e2d8"/>
    <ellipse cx="638" cy="173" rx="14" ry="34" transform="rotate(-61 638 173)" fill="#8f8d88"/>
    <path d="M83 328 L470 118 L635 207 L245 411 Z" fill="${hex}" opacity="${roughness}" filter="url(#grain)"/>
  </g>
  <path d="M111 347 L246 412" stroke="#fff" stroke-opacity=".16" stroke-width="2"/>
</svg>`;
}

mkdirSync(output, { recursive: true });
const imageJobs = [];
for (const [code, name, hex] of colors) {
  for (const [finish] of finishes) {
    const id = `wrap-${code}-${finish}`;
    imageJobs.push(sharp(Buffer.from(materialSvg({ hex, finish }))).webp({ quality: 84 }).toFile(join(output, `${id}.webp`)));
  }
}
for (const [code, finish, id] of specials) {
  const color = colors.find(([candidate]) => candidate === code);
  imageJobs.push(sharp(Buffer.from(materialSvg({ hex: color[2], finish }))).webp({ quality: 84 }).toFile(join(output, `${id}.webp`)));
}
await Promise.all(imageJobs);

const colorRows = added.map(([code, name, hex, family], index) =>
  `(${esc(`color-${code}`)},${esc(code)},${esc(name)},${esc(hex)},${esc(family)},${170 + index * 10},1)`).join(',\n ');
const assetUpdates = colors.flatMap(([code]) => finishes.map(([finish]) =>
  `UPDATE wrap_options SET preview_asset=${esc(`/wrap-catalog/wrap-${code}-${finish}.webp`)} WHERE id=${esc(`wrap-${code}-${finish}`)};`));
for (const [, , id] of specials) assetUpdates.push(`UPDATE wrap_options SET preview_asset=${esc(`/wrap-catalog/${id}.webp`)} WHERE id=${esc(id)};`);

const sql = `-- A larger, photo-led vinyl catalog for the configurator. Images are original\n-- project assets rendered by scripts/build-wrap-catalog.mjs; no shop photography is copied.\nALTER TABLE wrap_options ADD COLUMN preview_asset TEXT;\n\nINSERT INTO wrap_colors (id,code,display_name,hex,family,sort_order,is_active) VALUES\n ${colorRows};\n\nINSERT OR IGNORE INTO wrap_options\n  (id,color_id,finish_id,display_name,preview_swatch,prompt_fragment,sort_order,is_active)\nSELECT 'wrap-'||c.code||'-'||f.code, c.id, f.id, c.display_name||' · '||f.display_name, c.hex,\n 'Change the car body color to '||lower(c.display_name)||' using realistic factory-quality automotive vinyl and a '||f.prompt_fragment||'. Keep panel gaps, reflections and body geometry realistic; avoid oversaturation.',\n (c.sort_order * 10 + f.sort_order), 1\nFROM wrap_colors c JOIN wrap_finishes f\nWHERE c.id IN (${added.map(([code]) => esc(`color-${code}`)).join(',')})\n  AND f.code IN ('gloss','satin','matte');\n\n${assetUpdates.join('\n')}\n`;
writeFileSync(migrationPath, sql);
console.log(`Rendered ${imageJobs.length} material previews and wrote ${migrationPath}`);
