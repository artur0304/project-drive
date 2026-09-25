import assert from 'node:assert/strict';
import { normalizeAuthorizedFeed, parseWheelTitle } from './wheel-feed.mjs';

assert.deepEqual(
  parseWheelTitle('Mak Rapp Gloss Black R19 W9 PCD5x112 ET38 DIA66.6'),
  { diameter: 19, width: 9, boltPattern: '5x112', offset: 38, centerBore: 66.6 },
);

const blocked = { id: 'source-shop', name: 'Shop', usageStatus: 'permission_required', rightsBasis: null };
assert.throws(() => normalizeAuthorizedFeed([{ id: '1' }], blocked), /не разрешён/);

const approved = { id: 'source-maker', name: 'Maker feed', usageStatus: 'approved', rightsBasis: 'Written distributor licence 2026-09-25' };
const [wheel] = normalizeAuthorizedFeed([{
  id: 'mak-rapp-19-9', brand: 'Mak', model: 'Rapp', title: 'Mak Rapp Gloss Black R19 W9 PCD5x112 ET38 DIA66.6',
  color: 'Gloss Black', finish: 'Gloss', type: 'alloy', price_cents: 1445100, source_url: 'https://supplier.example/mak-rapp',
}], approved);
assert.equal(wheel.variant.diameter, 19);
assert.equal(wheel.variant.width, 9);
assert.equal(wheel.variant.boltPattern, '5x112');
assert.equal(wheel.source.wheelType, 'alloy');
assert.equal(wheel.variant.rightsBasis, approved.rightsBasis);

console.log('✅ Фид дисков нормализуется, а источник без письменных прав блокируется.');
