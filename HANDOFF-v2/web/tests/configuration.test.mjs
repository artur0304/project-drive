import assert from 'node:assert/strict';
import test from 'node:test';
import {
  costFromPricing, draftFromOperations, operationsFromDraft,
} from '../app/lib/configuration.js';

test('конфигуратор создаёт операции и считает сумму по серверному прайсу', () => {
  const draft = {
    wrap: { color: 'Racing Green', finish: 'Satin' },
    tint: { name: 'Medium', level: '35' },
    wheel: { kind: 'wheel_replace', name: 'BBS CH-R', color: '#8B8D92', label: 'BBS CH-R' },
  };
  const operations = operationsFromDraft(draft);
  const pricing = { wrap: 25, tint: 10, wheel_replace: 20, wheel_recolor: 10 };
  assert.equal(costFromPricing(operations, pricing), 55);
  assert.deepEqual(draftFromOperations(operations), {
    wrap: { color: 'Racing Green', finish: 'Satin' },
    tint: { name: 'Medium', level: '35' },
    wheel: { kind: 'wheel_replace', name: 'BBS CH-R', color: '#8B8D92', label: 'BBS CH-R' },
  });
});

test('неизвестная цена не превращается в тихий ноль', () => {
  assert.throws(
    () => costFromPricing([{ kind: 'future_operation' }], { wrap: 25 }),
    /Missing server price/,
  );
});

test('catalog ids уходят на сервер вместо свободного текста', () => {
  assert.deepEqual(operationsFromDraft({
    wrap: { optionId: 'wrap-deep-navy-metallic', color: 'Deep Navy', finish: 'Metallic' },
    tint: { levelId: 'tint-dark', zoneId: 'zone-all', name: 'Dark', level: '35' },
    wheel: { kind: 'wheel_recolor', optionId: 'wheel-color-bronze', name: 'Bronze', color: '#8A5A2E' },
  }), [
    { kind: 'wrap', optionId: 'wrap-deep-navy-metallic' },
    { kind: 'tint', levelId: 'tint-dark', zoneId: 'zone-all' },
    { kind: 'wheel_recolor', name: 'Bronze', color: '#8A5A2E', optionId: 'wheel-color-bronze' },
  ]);
});
