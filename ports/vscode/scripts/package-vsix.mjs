import { spawnSync } from 'node:child_process';
import { resolve } from 'node:path';
const args = process.argv.slice(2);
const index = args.indexOf('--out');
if (index >= 0 && args[index + 1]) args[index + 1] = resolve(args[index + 1]);
const result = spawnSync(process.execPath, [resolve('node_modules/@vscode/vsce/vsce'), 'package', '--no-dependencies',
  '--baseContentUrl', 'https://github.com/Atreyu-94/Noctis2/blob/master/ports/vscode',
  '--baseImagesUrl', 'https://raw.githubusercontent.com/Atreyu-94/Noctis2/master/ports/vscode', ...args], {
  cwd: resolve('ports/vscode'), stdio: 'inherit',
});
if (result.error) throw result.error;
process.exitCode = result.status ?? 1;
