import sharp from 'sharp';

// Reference для замены дисков должен быть пригоден модели: квадратный,
// прозрачный и без скрытых EXIF/GPS. Возвращаем уже очищенный PNG/WebP.
export async function validateWheelReference(buffer, contentType) {
  if (!['image/png', 'image/webp'].includes(contentType)) {
    const error = new Error('reference должен быть PNG или WebP');
    error.statusCode = 415;
    throw error;
  }
  const image = sharp(buffer, { failOn: 'error', limitInputPixels: 20_000_000 });
  const metadata = await image.metadata();
  if (!metadata.width || !metadata.height || metadata.width !== metadata.height) {
    const error = new Error('reference должен иметь пропорции 1:1');
    error.statusCode = 422;
    throw error;
  }
  if (!metadata.hasAlpha) {
    const error = new Error('reference должен иметь прозрачный фон');
    error.statusCode = 422;
    throw error;
  }
  const output = contentType === 'image/webp'
    ? await image.rotate().resize(1024, 1024, { fit: 'inside', withoutEnlargement: true }).webp({ quality: 92, alphaQuality: 100 }).toBuffer()
    : await image.rotate().resize(1024, 1024, { fit: 'inside', withoutEnlargement: true }).png({ compressionLevel: 9 }).toBuffer();
  const clean = await sharp(output).metadata();
  return { buffer: output, width: clean.width, height: clean.height, hasAlpha: clean.hasAlpha };
}
