import assert from 'node:assert/strict';
import { test } from 'node:test';
import { readFile, readdir } from 'node:fs/promises';
import { spawnSync } from 'node:child_process';
import { catalog, samplePath } from './sample-catalog.mjs';

test('sample catalogue covers every source file exactly once', async () => {
  const files = Object.values(catalog).map(entry => entry.file);
  assert.equal(new Set(files).size, files.length);
  assert.deepEqual(files.sort(), (await readdir(new URL('./samples/languages/', import.meta.url))).sort());
  for (const language of Object.keys(catalog)) {
    assert.ok((await readFile(samplePath(language), 'utf8')).trim().length > 0);
  }
  assert.throws(() => samplePath('__proto__'));
  const session = JSON.parse(await readFile(samplePath('json'), 'utf8')).session;
  assert.equal(session.observations.length, 3);
});

test('TypeScript and TSX examples typecheck without third-party packages', () => {
  const result = spawnSync(process.execPath, ['node_modules/typescript/bin/tsc',
    '--ignoreConfig', '--noEmit', '--strict', '--target', 'ES2022', '--module', 'ESNext',
    '--jsx', 'react', '--jsxFactory', 'element', '--skipLibCheck',
    samplePath('typescript'), samplePath('tsx')], { encoding: 'utf8', timeout: 30000 });
  assert.ifError(result.error);
  assert.equal(result.status, 0, result.stdout + result.stderr);
});
