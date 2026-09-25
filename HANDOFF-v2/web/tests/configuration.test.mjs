import assert from 'node:assert/strict';
import test from 'node:test';
import {
  costFromPricing, draftFromOperations, operationsFromDraft, passesForOperations,
} from '../app/lib/configuration.js';

test('конфигуратор создаёт операции и считает цену по числу проходов AI', () => {
  const draft = {
    wrap: { color: 'Racing Green', finish: 'Satin' },
    tint: { name: 'Medium', level: '35' },
    wheel: { kind: 'wheel_replace', name: 'BBS CH-R', color: '#8B8D92', label: 'BBS CH-R' },
  };
  const operations = operationsFromDraft(draft);
  const pricing = { creditsPerPass: 1 };
  // Плёнка, тонировка и reference-диск идут одним запросом: 1 кредит.
  assert.equal(costFromPricing(operations, pricing), 1);
  assert.deepEqual(draftFromOperations(operations), {
    wrap: { color: 'Racing Green', finish: 'Satin' },
    tint: { name: 'Medium', level: '35' },
    wheel: { kind: 'wheel_replace', name: 'BBS CH-R', color: '#8B8D92', label: 'BBS CH-R' },
  });
});

test('число проходов: все выбранные правки и reference-диск — один проход', () => {
  assert.equal(passesForOperations([]), 0);
  assert.equal(passesForOperations([{ kind: 'wrap' }]), 1);
  assert.equal(passesForOperations([{ kind: 'wrap' }, { kind: 'tint' }, { kind: 'wheel_recolor' }]), 1);
  assert.equal(passesForOperations([{ kind: 'wheel_replace' }]), 1);
  assert.equal(passesForOperations([{ kind: 'wrap' }, { kind: 'wheel_replace' }]), 1);
});

test('без данных о цене используется 1 кредит за проход', () => {
  // Если сервер ещё не ответил, считаем по умолчанию 1 кредит за проход,
  // а число проходов берём из состава операций.
  assert.equal(costFromPricing([{ kind: 'wrap' }], null), 1);
  assert.equal(costFromPricing([{ kind: 'wrap' }, { kind: 'wheel_replace' }], undefined), 1);
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
