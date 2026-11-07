import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';

export const catalog = JSON.parse(await readFile(new URL('./samples/catalog.json', import.meta.url), 'utf8'));
assert.ok(catalog && typeof catalog === 'object' && !Array.isArray(catalog));
for (const [language, entry] of Object.entries(catalog)) {
  assert.match(language, /^[a-z]+$/);
  assert.ok(entry && typeof entry === 'object');
  assert.equal(typeof entry.file, 'string');
  assert.match(entry.file, /^[a-z][a-z-]*\.[a-z]+$/);
  assert.ok(Array.isArray(entry.features) && entry.features.length > 0);
  assert.ok(entry.features.every(value => typeof value === 'string' && value.length > 0));
}
export function samplePath(language) {
  assert.ok(Object.hasOwn(catalog, language), `Unknown sample language: ${language}`);
  return fileURLToPath(new URL(`./samples/languages/${catalog[language].file}`, import.meta.url));
}
