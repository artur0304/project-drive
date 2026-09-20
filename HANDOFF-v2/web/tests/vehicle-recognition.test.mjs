import assert from 'node:assert/strict';
import test from 'node:test';
import { normalizeConfirmedVehicle, suggestVehicleFromFileName } from '../app/lib/vehicle-recognition.js';

test('filename hint suggests a vehicle but remains editable data', () => {
  assert.deepEqual(suggestVehicleFromFileName('BMW-M4-competition-front.jpg'), {
    make: 'BMW', model: 'M4 COMPETITION FRONT', source: 'filename_hint',
  });
  assert.equal(suggestVehicleFromFileName('Photo 1.jpg'), null);
});

test('confirmed vehicle is trimmed, bounded and optional', () => {
  assert.deepEqual(normalizeConfirmedVehicle({ make: ' BMW ', model: ' X5 ' }), { make: 'BMW', model: 'X5' });
  assert.equal(normalizeConfirmedVehicle({ make: ' ', model: '' }), null);
});
