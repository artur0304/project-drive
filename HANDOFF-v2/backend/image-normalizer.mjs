import sharp from 'sharp';

export class VehiclePhotoValidationError extends Error {
  constructor(code, message) {
    super(message);
    this.name = 'VehiclePhotoValidationError';
    this.code = code;
  }
}

// Бесплатный локальный preflight отсекает файлы, на которых генерация заведомо
// бесполезна: миниатюры и экстремально узкие панорамы/скриншоты. Он не утверждает,
// что на фото машина — семантическая проверка останется отдельным адаптером после
// разрешения реального AI. Так мы не создаём ложного чувства модерации.
export async function validateVehiclePhoto(buffer) {
  const metadata = await sharp(buffer, { failOn: 'error', limitInputPixels: 80_000_000 }).metadata();
  const width = Number(metadata.width || 0);
  const height = Number(metadata.height || 0);
  if (!width || !height) throw new VehiclePhotoValidationError('missing_dimensions', 'не удалось определить размер изображения');
  if (Math.min(width, height) < 480) {
    throw new VehiclePhotoValidationError('too_small', 'фото слишком маленькое: короткая сторона должна быть не меньше 480 px');
  }
  const ratio = width / height;
  if (ratio < 0.4 || ratio > 3) {
    throw new VehiclePhotoValidationError('extreme_aspect_ratio', 'слишком узкий кадр: загрузите обычное фото всей машины');
  }
  return { width, height, format: metadata.format || null };
}

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
