import assert from 'node:assert/strict';
import sharp from 'sharp';
import { normalizeUploadedImage, validateVehiclePhoto, VehiclePhotoValidationError } from './image-normalizer.mjs';

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

const validPhoto = await sharp({ create: { width: 1280, height: 960, channels: 3, background: '#45505e' } }).jpeg().toBuffer();
assert.deepEqual(await validateVehiclePhoto(validPhoto), { width: 1280, height: 960, format: 'jpeg' });

const thumbnail = await sharp({ create: { width: 320, height: 240, channels: 3, background: '#45505e' } }).jpeg().toBuffer();
await assert.rejects(() => validateVehiclePhoto(thumbnail), (error) => error instanceof VehiclePhotoValidationError && error.code === 'too_small');

const panorama = await sharp({ create: { width: 2000, height: 500, channels: 3, background: '#45505e' } }).jpeg().toBuffer();
await assert.rejects(() => validateVehiclePhoto(panorama), (error) => error instanceof VehiclePhotoValidationError && error.code === 'extreme_aspect_ratio');

console.log('✅ Ориентация и preflight проверены, EXIF/IPTC/XMP удалены из JPEG.');
