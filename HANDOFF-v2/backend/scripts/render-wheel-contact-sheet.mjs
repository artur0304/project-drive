import { readFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import path from 'node:path';
import sharp from 'sharp';

const here = path.dirname(fileURLToPath(import.meta.url));
const publicDir = path.resolve(here, '../../web/public/wheel-catalog/commons');
const records = JSON.parse(await readFile(path.join(publicDir, 'ATTRIBUTION.json'), 'utf8'));
const cell = 320;
const columns = 4;
const rows = Math.ceil(records.length / columns);
const composites = [];

for (let index = 0; index < records.length; index += 1) {
  const record = records[index];
  const left = (index % columns) * cell;
  const top = Math.floor(index / columns) * cell;
  const image = await sharp(path.join(publicDir, `${record.slug}.webp`))
    .resize(cell, cell - 52, { fit: 'contain', background: '#e7dfd2' })
    .toBuffer();
  composites.push({ input: image, left, top });
  const label = `${record.brand} ${record.model}`.replaceAll('&', '&amp;').replaceAll('<', '&lt;');
  composites.push({
    input: Buffer.from(`<svg width="${cell}" height="52"><rect width="100%" height="100%" fill="#121317"/><text x="16" y="31" fill="#f4efe7" font-family="Arial" font-size="16" font-weight="700">${label}</text></svg>`),
    left, top: top + cell - 52,
  });
}

await sharp({ create: { width: columns * cell, height: rows * cell, channels: 3, background: '#e7dfd2' } })
  .composite(composites)
  .jpeg({ quality: 90 })
  .toFile(path.resolve(publicDir, '../real-wheel-contact-sheet.jpg'));
