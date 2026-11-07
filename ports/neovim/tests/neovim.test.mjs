import assert from 'node:assert/strict';
import { test } from 'node:test';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { readFile, mkdtemp, readdir, rm } from 'node:fs/promises';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { build } from '../../../dist/ports/neovim/src/build.js';
test('committed Lua data and entry points match the current core', async () => {
  const directory = await mkdtemp(join(tmpdir(), 'noctis2-lua-'));
  try {
    await build(directory);
    for (const folder of ['colors', 'lua/noctis2/generated']) {
      const expectedNames = await readdir(join(directory, folder));
      const checkedIn = fileURLToPath(new URL('../' + folder + '/', import.meta.url));
      assert.deepEqual((await readdir(checkedIn)).sort(), expectedNames.sort());
      for (const name of expectedNames) {
        assert.equal((await readFile(join(checkedIn, name), 'utf8')).replaceAll('\r\n', '\n'),
          await readFile(join(directory, folder, name), 'utf8'), name);
      }
    }
  } finally { await rm(directory, { recursive: true, force: true }); }
});
test('Neovim loads every variant, native groups, options and repeated switches', () => {
  const command = process.env.NVIM ?? 'nvim';
  const result = spawnSync(command, ['--headless', '-u', 'NONE', '-l', fileURLToPath(new URL('runtime.lua', import.meta.url))], {
    encoding: 'utf8', timeout: 30000,
  });
  assert.ifError(result.error);
  assert.equal(result.status, 0, result.stdout + result.stderr);
  assert.match(result.stdout + result.stderr, /11 variants verified/);
});
