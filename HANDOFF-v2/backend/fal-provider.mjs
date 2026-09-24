import { basename, dirname, extname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { fal } from '@fal-ai/client';
import { meanPixelDifference } from './image-difference.mjs';
import { SpendGuard } from './spend-guard.mjs';
import { createLocalObjectStorage } from './object-storage.mjs';

export const FAL_MODEL = 'fal-ai/nano-banana-2/edit';
export const FAL_1K_COST_USD = 0.08;
const root = dirname(fileURLToPath(import.meta.url));

function mimeFor(path) {
  return extname(path).toLowerCase() === '.png' ? 'image/png' : extname(path).toLowerCase() === '.webp' ? 'image/webp' : 'image/jpeg';
}

export function createFalProvider({
  falClient = fal, guard = new SpendGuard(), fetchImpl = fetch, db = null,
  timeoutMs = Number(process.env.PROJECT_DRIVE_FAL_TIMEOUT_MS || 90_000),
  objectStorage = createLocalObjectStorage({ backendRoot: root, wheelCatalogRoot: join(root, '..', 'web', 'public', 'wheel-catalog') }),
} = {}) {
  if (process.env.FAL_KEY) falClient.config({ credentials: process.env.FAL_KEY });
  async function upload(url, reference = null) {
    if (reference?.fal_url) return reference.fal_url;
    const bytes = await objectStorage.get(url);
    const name = basename(url);
    const remoteUrl = await falClient.storage.upload(new File([bytes], name, { type: mimeFor(name) }));
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
      let timeoutId;
      const providerCall = falClient.subscribe(FAL_MODEL, {
        input: { prompt, image_urls: imageUrls, aspect_ratio: 'auto', resolution: '1K', num_images: 1, output_format: 'png', limit_generations: true, enable_web_search: false },
      });
      const timeout = new Promise((_, reject) => {
        timeoutId = setTimeout(() => reject(new Error('fal_timeout')), Math.max(1, timeoutMs));
      });
      let response;
      try { response = await Promise.race([providerCall, timeout]); }
      finally { clearTimeout(timeoutId); }
      const outputUrl = response?.data?.images?.[0]?.url;
      if (!outputUrl) throw new Error('fal_empty_result');
      const download = await fetchImpl(outputUrl);
      if (!download.ok) throw new Error('fal_download_failed');
      const output = Buffer.from(await download.arrayBuffer());
      const source = await objectStorage.get(sourceImage);
      const difference = await meanPixelDifference(source, output);
      const threshold = Number(process.env.PROJECT_DRIVE_MIN_IMAGE_DIFFERENCE || 0.012);
      if (difference < threshold) throw new Error('result_unchanged');
      const name = `${crypto.randomUUID()}.png`;
      const outputImage = await objectStorage.put({ scope: 'uploads', name, bytes: output });
      guard.settle(reservation, FAL_1K_COST_USD);
      return { ok: true, outputImage, costUsd: FAL_1K_COST_USD, provider: 'fal', model: FAL_MODEL, difference };
    } catch (error) {
      if (reservation) submitted ? guard.settle(reservation, FAL_1K_COST_USD) : guard.release(reservation);
      return {
        ok: false,
        error: ['result_unchanged','lifetime_budget_exceeded','daily_budget_exceeded','fal_key_missing','fal_timeout'].includes(error.message) ? error.message : 'provider_error',
        costUsd: submitted ? FAL_1K_COST_USD : 0, provider: 'fal', model: FAL_MODEL,
      };
    }
  };
}
