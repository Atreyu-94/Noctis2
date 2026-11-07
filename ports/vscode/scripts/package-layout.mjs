import { existsSync } from 'node:fs';
import { readdir } from 'node:fs/promises';
import { join } from 'node:path';

// Historical release tags keep the extension at the repository root.
export function vscodeRoot(root = process.cwd()) {
  return existsSync(join(root, 'ports/vscode/package.json')) ? join(root, 'ports/vscode') : root;
}
export async function graphics(root) {
  const files = await readdir(join(root, 'images'), { recursive: true });
  return files.map(path => 'images/' + path.replaceAll('\\', '/'))
    .filter(path => /\.(png|svg)$/.test(path) && !path.split('/').at(-1).startsWith('._')).sort();
}
