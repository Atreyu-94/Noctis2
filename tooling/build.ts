import { mkdir, writeFile } from 'node:fs/promises';
import { resolve, join } from 'node:path';
import { getTheme, variantIds, contractVersion } from '../core/src/index.js';
import { build as vscode } from '../ports/vscode/src/build.js';
import { build as zed } from '../ports/zed/src/build.js';
import { build as neovim } from '../ports/neovim/src/build.js';

const destinations = {
   vscode: async (root: string) => vscode(join(root, 'themes')),
   zed, neovim,
};
const [target = 'all', output] = process.argv.slice(2);
if (target !== 'all' && !Object.hasOwn(destinations, target)) throw new Error(`Unknown port: ${target}`);
if (target === 'all' && output) throw new Error('An output directory requires one port');
for (const [name, build] of Object.entries(destinations)) {
   if (target === 'all' || target === name) await build(resolve(output ?? `ports/${name}`));
}
if (target === 'all') {
   await mkdir('dist/data', { recursive: true });
   await writeFile('dist/data/noctis2.json', JSON.stringify({ contractVersion, variants: variantIds.map(getTheme) }, null, 2) + '\n');
}
