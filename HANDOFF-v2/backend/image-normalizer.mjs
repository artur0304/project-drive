import sharp from 'sharp';

// Нормализуем пользовательскую фотографию до безопасного JPEG. rotate()
// применяет ориентацию EXIF. Мы намеренно не вызываем withMetadata(), поэтому
// EXIF, GPS, IPTC и XMP не копируются в результат.
export function normalizeUploadedImage(buffer) {
  return sharp(buffer, { failOn: 'error', limitInputPixels: 80_000_000 })
    .rotate()
    .resize({ width: 4096, height: 4096, fit: 'inside', withoutEnlargement: true })
    .jpeg({ quality: 92, mozjpeg: true })
    .toBuffer();
}
