import { createHash } from 'node:crypto';
import { readFileSync } from 'node:fs';
import { spawnSync } from 'node:child_process';

const target = process.argv[2];
if (!['neovim', 'zed', 'tinymist'].includes(target)) {
  throw new Error('Expected neovim, zed or tinymist.');
}
if (target !== 'tinymist') {
  const inputs = JSON.parse(readFileSync('test-results/native-languages/inputs.json', 'utf8'));
  const hash = createHash('sha256').update(readFileSync('tests/native-languages.lock.json')).digest('hex');
  if (inputs.lockSha256 !== hash) throw new Error('Native inputs are stale: run npm run prepare:languages:native.');
}
if (target === 'tinymist' && !process.env.TINYMIST_BIN) {
  throw new Error('Set TINYMIST_BIN to the Tinymist executable.');
}
const command = target === 'zed' ? process.env.PYTHON ?? 'python' : process.env.NVIM ?? 'nvim';
const args = target === 'zed' ? ['ports/zed/tests/languages.py']
  : ['--headless', '-u', 'NONE', '-i', 'NONE', '-l', `ports/neovim/tests/${target === 'tinymist' ? 'tinymist' : 'languages'}.lua`];
const result = spawnSync(command, args, { stdio: 'inherit', timeout: 120_000 });
if (result.error) throw result.error;
process.exit(result.status ?? 1);
