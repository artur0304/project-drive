import test from 'node:test';
import assert from 'node:assert/strict';
import { parseCsv } from '../app/lib/csv.js';

test('CSV import preserves commas and escaped quotes inside quoted cells', () => {
  const rows = parseCsv('brand,model,color\nBBS,"CH-R, II","Titanium ""Grey"""\n');
  assert.deepEqual(rows, [{ brand: 'BBS', model: 'CH-R, II', color: 'Titanium "Grey"' }]);
});

test('CSV import rejects an unclosed quote', () => {
  assert.throws(() => parseCsv('brand,model\nBBS,"CH-R\n'), /unclosed quote/);
});
