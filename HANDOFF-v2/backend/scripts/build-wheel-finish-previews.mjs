import sharp from 'sharp';
import { mkdirSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const here = dirname(fileURLToPath(import.meta.url));
const backend = join(here, '..');
const publicRoot = join(backend, '..', 'web', 'public');
const source = join(publicRoot, 'wheel-catalog', 'commons', 'aez-valencia-d.webp');
const output = join(publicRoot, 'wheel-finishes');
const migration = join(backend, 'migrations', '012_remove_illustrated_wheels.sql');

const finishes = [
  ['wheel-color-black-gloss', '#111214', .48], ['wheel-color-black-matte', '#242528', .52],
  ['wheel-color-graphite', '#555A60', .66], ['wheel-color-bronze', '#94612F', .78],
  ['wheel-color-gold', '#C7A24E', .86], ['wheel-color-silver', '#AEB4BA', .92],
  ['wheel-color-white', '#DEDCD4', 1], ['wheel-color-copper', '#AE6732', .8],
];

mkdirSync(output, { recursive: true });
for (const [id, color, brightness] of finishes) {
  const resized = await sharp(source).resize(390, 390, { fit: 'contain', background: '#ffffff' }).removeAlpha().png().toBuffer();
  const mask = await sharp(resized).grayscale().negate().linear(3.6, 0).blur(.6).png().toBuffer();
  const wheel = await sharp(resized).grayscale().tint(color).linear(brightness, 0).joinChannel(mask).png().toBuffer();
  await sharp({ create: { width: 620, height: 390, channels: 3, background: '#d8d5ce' } })
    .composite([
      { input: wheel, left: 115, top: 0 },
      { input: Buffer.from('<svg xmlns="http://www.w3.org/2000/svg" width="620" height="390"><ellipse cx="310" cy="354" rx="150" ry="17" fill="#111318" opacity=".2"/></svg>'), blend: 'multiply' },
    ])
    .webp({ quality: 86 })
    .toFile(join(output, `${id}.webp`));
}

const updates = finishes.map(([id]) => `UPDATE wheel_color_options SET preview_asset='/wheel-finishes/${id}.webp' WHERE id='${id}';`).join('\n');
writeFileSync(migration, `-- Retire the original illustrated wheel placeholders and use real wheel photography.\nALTER TABLE wheel_color_options ADD COLUMN preview_asset TEXT;\n${updates}\nUPDATE wheel_models SET visible=0 WHERE image_rights_basis='Original catalog illustration';\n`);
console.log(`Rendered ${finishes.length} wheel finish previews and wrote ${migration}`);
