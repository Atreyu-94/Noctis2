import { readFile, writeFile, mkdir } from 'node:fs/promises';
import { createHash } from 'node:crypto';
import { join, basename } from 'node:path';

const lockText = await readFile('ports/vscode/tests/upstream-grammars.json', 'utf8');
const lock = JSON.parse(lockText);
const directory = 'test-results/upstream-languages';
await mkdir(directory, { recursive: true });
const inputs = { lockSha256: createHash('sha256').update(lockText).digest('hex'), files: {} };
async function download(repo, rev, path, output) {
  const url = `https://raw.githubusercontent.com/${repo}/${rev}/${path}`;
  const response = await fetch(url, { signal: AbortSignal.timeout(60_000) });
  if (!response.ok) throw new Error(`${response.status}: ${url}`);
  const bytes = Buffer.from(await response.arrayBuffer());
  await writeFile(join(directory, output), bytes);
  inputs.files[output] = { url, sha256: createHash('sha256').update(bytes).digest('hex') };
}
for (const [language, source] of Object.entries(lock.external)) {
  for (const path of source.files) await download(source.repo, source.rev, path, `${language}-${basename(path)}`);
}
const baseline = JSON.parse(await readFile('ports/vscode/tests/baseline.json', 'utf8'));
for (const theme of baseline.themes) {
  await download('liviuschera/noctis', lock.upstream, theme.path.replace(/^\.\//, ''), basename(theme.path));
}
await download('liviuschera/noctis', lock.upstream, 'README.md', 'README.md');
await writeFile(join(directory, 'inputs.json'), JSON.stringify(inputs, null, 2));
console.log('Prepared pinned upstream themes and four additional grammar providers.');
