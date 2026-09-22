export function operationsFromDraft(draft) {
  const operations = [];
  if (draft?.wrap) operations.push(draft.wrap.optionId
    ? { kind: 'wrap', optionId: draft.wrap.optionId }
    : { kind: 'wrap', color: draft.wrap.color, finish: draft.wrap.finish });
  if (draft?.tint) operations.push(draft.tint.levelId && draft.tint.zoneId
    ? { kind: 'tint', levelId: draft.tint.levelId, zoneId: draft.tint.zoneId }
    : { kind: 'tint', level: draft.tint.level, name: draft.tint.name });
  if (draft?.wheel) operations.push({
    kind: draft.wheel.kind, name: draft.wheel.name, color: draft.wheel.color,
    ...(draft.wheel.optionId ? { optionId: draft.wheel.optionId } : {}),
    ...(draft.wheel.variantId ? { variantId: draft.wheel.variantId } : {}),
    ...(draft.wheel.referenceImage ? { referenceImage: draft.wheel.referenceImage } : {}),
  });
  return operations;
}

export function costFromPricing(operations, pricing) {
  if (!pricing) return 0;
  return operations.reduce((sum, operation) => {
    const price = pricing[operation.kind];
    if (!Number.isFinite(price)) throw new Error(`Missing server price for ${operation.kind}`);
    return sum + price;
  }, 0);
}

export function draftFromOperations(operations = []) {
  const draft = {};
  for (const operation of operations) {
    if (operation.kind === 'wrap') {
      draft.wrap = { ...(operation.optionId ? { optionId: operation.optionId } : {}), color: operation.color, finish: operation.finish };
    } else if (operation.kind === 'tint') {
      draft.tint = {
        ...(operation.levelId ? { levelId: operation.levelId } : {}),
        ...(operation.zoneId ? { zoneId: operation.zoneId } : {}),
        name: operation.name, level: operation.level, ...(operation.zone ? { zone: operation.zone } : {}),
      };
    } else if (operation.kind === 'wheel_replace' || operation.kind === 'wheel_recolor') {
      draft.wheel = {
        kind: operation.kind, ...(operation.optionId ? { optionId: operation.optionId } : {}),
        name: operation.name,
        color: operation.color,
        ...(operation.variantId ? { variantId: operation.variantId } : {}),
        ...(operation.referenceImage ? { referenceImage: operation.referenceImage } : {}),
        label: operation.kind === 'wheel_recolor' ? `${operation.name} wheels` : operation.name,
      };
    }
  }
  return draft;
}
