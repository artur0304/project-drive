import test from 'node:test';
import assert from 'node:assert/strict';
import { parseVehicleCommand } from '../app/lib/command-parser.js';

test('command creates a reviewable wrap and tint-removal patch', () => {
  const result = parseVehicleCommand('Снять тонировку и поклеить кузов в красную матовую плёнку');
  assert.deepEqual(result.patch.wrap, { color: 'Ember Red', hex: '#9C2B2B', finish: 'Matte' });
  assert.equal(result.patch.tint, null);
});

test('wheel replacement asks for exact catalog selection', () => {
  const result = parseVehicleCommand('Поставить другие диски');
  assert.equal(result.needsWheelSelection, true);
  assert.equal(result.patch.wheel, undefined);
});

test('wheel recolor can be prepared without replacing the wheel model', () => {
  const result = parseVehicleCommand('Recolor wheels bronze');
  assert.equal(result.patch.wheel.kind, 'wheel_recolor');
  assert.equal(result.patch.wheel.name, 'Bronze');
});
