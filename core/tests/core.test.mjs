import assert from 'node:assert/strict';
import { test } from 'node:test';
import { getTheme, variantIds, composite, rgba } from '../../dist/core/src/index.js';
test('all variants have the same complete contract and independent returned data', () => {
  assert.equal(variantIds.length, 11);
  const first = getTheme('noctis');
  for (const id of variantIds) {
    const t = getTheme(id);
    assert.deepEqual(Object.keys(t.ui).sort(), Object.keys(first.ui).sort());
    for (const value of [...Object.values(t.ui), ...Object.values(t.palette)]) rgba(value);
    t.ui['surface.editor'] = '#000000';
    assert.notEqual(getTheme(id).ui['surface.editor'], '#000000');
  }
  assert.throws(() => getTheme('__proto__'), /Unknown/);
});
test('alpha is composed exactly once on the destination surface', () => {
  assert.equal(composite('#fff8', '#000'), '#888888');
  assert.equal(composite('#0000', '#abcdef'), '#abcdef');
  assert.equal(composite('#ff000080', '#ffffff'), '#ff7f7f');
  assert.throws(() => rgba('#xyz'));
  assert.throws(() => composite('#ffffff80', '#00000080'));
});
