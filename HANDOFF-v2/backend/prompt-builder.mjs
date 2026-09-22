// The prompt is assembled exclusively from server-owned catalog fragments.
// Changing this constant must also change PROMPT_VERSION to invalidate the cache.
export const PROMPT_VERSION = 'catalog-v1-fidelity-v1';
export const FIDELITY_CLAUSE_V1 = `Keep the exact same car, same model, same body shape, same angle, same position,
same background, same lighting and same reflections. Do not change the interior.
Do not add or remove any parts. Do not add brake calipers, spoilers, body kits or
badges. Do not change the license plate. Change ONLY what is explicitly requested
above. Photorealistic result, same photo quality as the original.`;

export function buildPrompt(operations) {
  const fragments = operations.map((operation) => operation.promptFragment).filter(Boolean);
  if (!fragments.length) throw new Error('catalog_prompt_missing');
  return `${fragments.join('\n')}\n${FIDELITY_CLAUSE_V1}`;
}

