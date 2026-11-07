import assert from 'node:assert/strict';
import { test } from 'node:test';
import { readFile } from 'node:fs/promises';
import { createHash } from 'node:crypto';
import { build } from '../../../dist/ports/vscode/src/build.js';
import { mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
test('full VS Code outputs remain identical to the pre-migration commit', async () => {
  const baseline = JSON.parse(await readFile(new URL('migration-baseline.json', import.meta.url)));
  const directory = await mkdtemp(join(tmpdir(), 'noctis2-migration-'));
  try {
    await build(directory);
    for (const [id, expected] of Object.entries(baseline.sha256LF)) {
      const text = await readFile(join(directory, `${id}.json`), 'utf8');
      assert.equal(createHash('sha256').update(text.replaceAll('\r\n', '\n')).digest('hex'), expected, id);
    }
  } finally { await rm(directory, { recursive: true, force: true }); }
});
