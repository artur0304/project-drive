import { readFile, writeFile } from 'node:fs/promises';
import { basename, dirname, extname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { fal } from '@fal-ai/client';
import { meanPixelDifference } from './image-difference.mjs';
import { SpendGuard } from './spend-guard.mjs';

export const FAL_MODEL = 'fal-ai/nano-banana-2/edit';
export const FAL_1K_COST_USD = 0.08;
const root = dirname(fileURLToPath(import.meta.url));

function localPath(url) {
  const match = String(url || '').match(/^\/(uploads|wheel-uploads|wheel-catalog)\/([a-z0-9._-]+)$/i);
  if (!match) throw new Error('local_image_path_invalid');
  const folder = match[1] === 'wheel-catalog' ? join(root, '..', 'web', 'public', 'wheel-catalog') : join(root, match[1]);
  return join(folder, basename(match[2]));
}

function mimeFor(path) {
  return extname(path).toLowerCase() === '.png' ? 'image/png' : extname(path).toLowerCase() === '.webp' ? 'image/webp' : 'image/jpeg';
}

export function createFalProvider({ falClient = fal, guard = new SpendGuard(), fetchImpl = fetch, db = null } = {}) {
  if (process.env.FAL_KEY) falClient.config({ credentials: process.env.FAL_KEY });
  async function upload(url, reference = null) {
    if (reference?.fal_url) return reference.fal_url;
    const path = localPath(url);
    const bytes = await readFile(path);
    const remoteUrl = await falClient.storage.upload(new File([bytes], basename(path), { type: mimeFor(path) }));
    if (reference?.id && db) db.cacheWheelReferenceFalUrl({ referenceId: reference.id, falUrl: remoteUrl });
    return remoteUrl;
  }

  return async function generateCarEdit({ sourceImage, referenceImage = null, reference = null, prompt, requestId = null }) {
    if (!process.env.FAL_KEY) return { ok: false, error: 'fal_key_missing' };
    let reservation;
    let submitted = false;
    try {
      reservation = guard.reserve(FAL_1K_COST_USD, { provider: 'fal', model: FAL_MODEL, requestId });
      const imageUrls = [await upload(sourceImage)];
      if (referenceImage) imageUrls.push(await upload(referenceImage, reference));
      submitted = true;
      const response = await falClient.subscribe(FAL_MODEL, {
        input: { prompt, image_urls: imageUrls, aspect_ratio: 'auto', resolution: '1K', num_images: 1, output_format: 'png', limit_generations: true, enable_web_search: false },
      });
      const outputUrl = response?.data?.images?.[0]?.url;
      if (!outputUrl) throw new Error('fal_empty_result');
      const download = await fetchImpl(outputUrl);
      if (!download.ok) throw new Error('fal_download_failed');
      const output = Buffer.from(await download.arrayBuffer());
      const source = await readFile(localPath(sourceImage));
      const difference = await meanPixelDifference(source, output);
      const threshold = Number(process.env.PROJECT_DRIVE_MIN_IMAGE_DIFFERENCE || 0.012);
      if (difference < threshold) throw new Error('result_unchanged');
      const name = `${crypto.randomUUID()}.png`;
      await writeFile(join(root, 'uploads', name), output);
      guard.settle(reservation, FAL_1K_COST_USD);
      return { ok: true, outputImage: `/uploads/${name}`, costUsd: FAL_1K_COST_USD, provider: 'fal', model: FAL_MODEL, difference };
    } catch (error) {
      if (reservation) submitted ? guard.settle(reservation, FAL_1K_COST_USD) : guard.release(reservation);
      return {
        ok: false,
        error: ['result_unchanged','lifetime_budget_exceeded','daily_budget_exceeded','fal_key_missing'].includes(error.message) ? error.message : 'provider_error',
        costUsd: submitted ? FAL_1K_COST_USD : 0, provider: 'fal', model: FAL_MODEL,
      };
    }
  };
}
