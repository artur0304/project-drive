import assert from 'node:assert/strict';
import sharp from 'sharp';
import { normalizeUploadedImage } from './image-normalizer.mjs';

// Создаём фотографию с EXIF-ориентацией прямо в памяти. Так тест не зависит от
// личных фотографий пользователя и всё равно доказывает удаление метаданных.
const input = await sharp({
  create: { width: 120, height: 60, channels: 3, background: '#336699' },
}).jpeg().withMetadata({ orientation: 6 }).toBuffer();

const before = await sharp(input).metadata();
assert.ok(before.exif, 'контрольный вход должен содержать EXIF');

const output = await normalizeUploadedImage(input);
const after = await sharp(output).metadata();
assert.equal(after.format, 'jpeg');
assert.equal(after.width, 60, 'EXIF-ориентация должна быть применена');
assert.equal(after.height, 120, 'EXIF-ориентация должна быть применена');
assert.equal(after.exif, undefined, 'EXIF не должен попасть в результат');
assert.equal(after.iptc, undefined, 'IPTC не должен попасть в результат');
assert.equal(after.xmp, undefined, 'XMP не должен попасть в результат');

console.log('✅ Ориентация применена, EXIF/IPTC/XMP удалены из JPEG.');
