export function operationsFromDraft(draft) {
  const operations = [];
  if (draft?.wrap) operations.push({ kind: 'wrap', color: draft.wrap.color, finish: draft.wrap.finish });
  if (draft?.tint) operations.push({ kind: 'tint', level: draft.tint.level, name: draft.tint.name });
  if (draft?.wheel) operations.push({ kind: draft.wheel.kind, name: draft.wheel.name, color: draft.wheel.color });
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
      draft.wrap = { color: operation.color, finish: operation.finish };
    } else if (operation.kind === 'tint') {
      draft.tint = { name: operation.name, level: operation.level };
    } else if (operation.kind === 'wheel_replace' || operation.kind === 'wheel_recolor') {
      draft.wheel = {
        kind: operation.kind,
        name: operation.name,
        color: operation.color,
        label: operation.kind === 'wheel_recolor' ? `${operation.name} wheels` : operation.name,
      };
    }
  }
  return draft;
}
