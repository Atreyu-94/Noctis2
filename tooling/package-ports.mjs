import { createWriteStream } from 'node:fs';
import { mkdir, readdir } from 'node:fs/promises';
import { join, resolve } from 'node:path';
import { pipeline } from 'node:stream/promises';
import yazl from 'yazl';

const output = resolve(process.argv[2] ?? 'test-results/packages');
await mkdir(output, { recursive: true });
// Native resources only: neither archive requires the authoring toolchain.
for (const [port, directories, files] of [
  ['zed', ['themes'], ['extension.toml', 'README.md', 'LICENSE.md']],
  ['neovim', ['colors', 'lua', 'doc'], ['README.md', 'LICENSE.md']],
]) {
  const root = resolve('ports', port);
  for (const dir of directories) {
    for (const entry of await readdir(join(root, dir), { recursive: true, withFileTypes: true })) {
      if (entry.isFile()) files.push(join(entry.parentPath, entry.name).slice(root.length + 1).replaceAll('\\', '/'));
    }
  }
  const filename = join(output, `noctis2-${port}.zip`);
  const zip = new yazl.ZipFile();
  const written = pipeline(zip.outputStream, createWriteStream(filename));
  for (const file of files.sort()) zip.addFile(join(root, file), file, { mtime: new Date('2000-01-01T00:00:00Z') });
  zip.end();
  await written;
  console.log(`${port}: ${files.length} native resources -> ${filename}`);
}
