import assert from 'node:assert/strict';
import { test } from 'node:test';
import { readFile } from 'node:fs/promises';
import { createHash } from 'node:crypto';
import { build } from '../../../dist/ports/vscode/src/build.js';
import { mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { getTheme } from '../../../dist/core/src/index.js';
test('VS Code outputs preserve the migration baseline except the explicit Python escape fix', async () => {
  const baseline = JSON.parse(await readFile(new URL('migration-baseline.json', import.meta.url)));
  const directory = await mkdtemp(join(tmpdir(), 'noctis2-migration-'));
  try {
    await build(directory);
    for (const [id, expected] of Object.entries(baseline.sha256LF)) {
      const text = await readFile(join(directory, `${id}.json`), 'utf8');
      const theme = JSON.parse(text);
      assert.equal(theme.semanticTokenColors['string.escapeCharacter:python'], getTheme(id).syntax.escape.foreground);
      // Preserve the immutable baseline: project out only this authorized correction.
      delete theme.semanticTokenColors['string.escapeCharacter:python'];
      assert.equal(createHash('sha256').update(JSON.stringify(theme, null, 3)).digest('hex'), expected, id);
    }
  } finally { await rm(directory, { recursive: true, force: true }); }
});
