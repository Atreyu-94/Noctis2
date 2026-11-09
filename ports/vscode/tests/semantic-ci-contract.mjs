import assert from 'node:assert/strict';

export function selectSemanticCases(matrix, input) {
  if (input === undefined) return Object.keys(matrix);
  const selected = input.split(',');
  assert.ok(selected.length && selected.every(key => key && Object.hasOwn(matrix, key)), 'Unknown or empty semantic case');
  assert.equal(new Set(selected).size, selected.length, 'Duplicate semantic case');
  return selected;
}
