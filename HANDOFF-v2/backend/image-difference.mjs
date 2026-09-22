import sharp from 'sharp';

export async function meanPixelDifference(first, second, size = 64) {
  const normalize = (input) => sharp(input).resize(size, size, { fit: 'fill' }).removeAlpha().raw().toBuffer();
  const [a, b] = await Promise.all([normalize(first), normalize(second)]);
  let difference = 0;
  for (let index = 0; index < a.length; index += 1) difference += Math.abs(a[index] - b[index]);
  return difference / (a.length * 255);
}

