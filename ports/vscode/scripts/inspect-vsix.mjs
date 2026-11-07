import { vscodeRoot, graphics as listGraphics } from './package-layout.mjs';
import { join } from 'node:path';
import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import { on } from 'node:events';
import { readFile, stat, writeFile } from 'node:fs/promises';
import { promisify } from 'node:util';
import yauzl from 'yauzl';
import sax from 'sax';

const [vsixPath, reportPath] = process.argv.slice(2);
if (!vsixPath || !reportPath) throw new Error('Usage: node ports/vscode/scripts/inspect-vsix.mjs <package.vsix> <report.json>');

const packageRoot = vscodeRoot();
const manifest = JSON.parse(await readFile(join(packageRoot, 'package.json'), 'utf8'));
assert.equal(manifest.contributes.themes.length, 11, 'Expected all eleven themes');
const graphics = await listGraphics(packageRoot);
const resources = new Map([
   ['extension/package.json', 'package.json'],
   ['extension/readme.md', 'README.md'],
   ['extension/changelog.md', 'CHANGELOG.md'],
   ['extension/LICENSE.md', 'LICENSE.md'],
   ...manifest.contributes.themes.map(theme => [
      `extension/${theme.path.replace(/^\.\//, '')}`, theme.path,
   ]),
   ...graphics.map(path => [`extension/${path}`, path]),
]);
const allowed = new Set(['[Content_Types].xml', 'extension.vsixmanifest', ...resources.keys()]);
const files = new Map();
// The current package is about 2 MiB. Bound both ZIP input and decompressed data.
const maxArchiveBytes = 64 * 1024 * 1024;
const maxEntryBytes = 16 * 1024 * 1024;
const maxTotalBytes = 64 * 1024 * 1024;
assert.ok((await stat(vsixPath)).size <= maxArchiveBytes, 'VSIX archive exceeds size limit');
let declaredBytes = 0;
let totalBytes = 0;
const zip = await promisify(yauzl.open)(vsixPath, { lazyEntries: true });
try {
   assert.equal(zip.entryCount, allowed.size, 'Unexpected VSIX entry count');
   const entries = on(zip, 'entry', { close: ['end'] });
   zip.readEntry();
   for await (const [entry] of entries) {
      assert.ok(allowed.has(entry.fileName), `Unexpected VSIX entry: ${entry.fileName}`);
      assert.ok(!files.has(entry.fileName), `Duplicate VSIX entry: ${entry.fileName}`);
      assert.ok(entry.uncompressedSize <= maxEntryBytes, 'VSIX entry exceeds size limit');
      declaredBytes += entry.uncompressedSize;
      assert.ok(declaredBytes <= maxTotalBytes, 'VSIX expanded data exceeds size limit');
      const stream = await promisify(zip.openReadStream.bind(zip))(entry);
      const chunks = [];
      let entryBytes = 0;
      for await (const chunk of stream) {
         entryBytes += chunk.length;
         totalBytes += chunk.length;
         assert.ok(entryBytes <= maxEntryBytes && totalBytes <= maxTotalBytes, 'VSIX streamed data exceeds size limit');
         chunks.push(chunk);
      }
      files.set(entry.fileName, Buffer.concat(chunks));
      zip.readEntry();
   }
} finally {
   zip.close();
}
assert.deepEqual([...files.keys()].sort(), [...allowed].sort(), 'VSIX resources are missing');
assert.deepEqual(JSON.parse(files.get('extension/package.json')), manifest, 'Packaged manifest differs');

// vsce rewrites documentation links; binary assets, themes and the license must remain exact.
const preserved = [];
for (const [entry, source] of resources) {
   if (source === 'package.json' || source === 'README.md' || source === 'CHANGELOG.md') continue;
   const bytes = files.get(entry);
   assert.ok(bytes.equals(await readFile(join(packageRoot, source))), `Packaged content changed: ${source}`);
   preserved.push({ path: source, sha256: createHash('sha256').update(bytes).digest('hex') });
}
const xml = files.get('extension.vsixmanifest').toString('utf8');
// Strict, namespace-aware parsing prevents comments or unrelated attributes from
// impersonating Metadata/Identity. DTDs are not part of the generated manifest.
const parser = sax.parser(true, { xmlns: true });
const namespace = 'http://schemas.microsoft.com/developer/vsx-schema/2011';
const path = [];
let metadataCount = 0;
let rootCount = 0;
let identity;
parser.ondoctype = () => { throw new Error('VSIX manifest DTD is forbidden'); };
parser.onopentag = node => {
   path.push(node.local);
   assert.equal(node.uri, namespace, 'Unexpected VSIX XML namespace');
   if (path.length === 1) {
      assert.equal(++rootCount, 1, 'Multiple VSIX XML roots');
      assert.equal(node.local, 'PackageManifest', 'Unexpected VSIX XML root');
   }
   if (node.local === 'Metadata') {
      assert.deepEqual(path, ['PackageManifest', 'Metadata'], 'Misplaced VSIX metadata');
      assert.equal(++metadataCount, 1, 'Duplicate VSIX metadata');
   }
   if (node.local === 'Identity') {
      assert.deepEqual(path, ['PackageManifest', 'Metadata', 'Identity'], 'Misplaced VSIX identity');
      assert.equal(identity, undefined, 'Duplicate VSIX identity');
      identity = node.attributes;
   }
};
parser.onclosetag = () => path.pop();
parser.write(xml).close();
assert.ok(identity, 'Missing VSIX identity');
for (const [key, value] of Object.entries({ Id: manifest.name, Publisher: manifest.publisher, Version: manifest.version })) {
   assert.equal(identity[key]?.value, value, `VSIX identity mismatch: ${key}`);
}
const report = {
   commit: execFileSync('git', ['rev-parse', 'HEAD'], { encoding: 'utf8' }).trim(),
   workingTreeDirty: Boolean(execFileSync('git', ['status', '--porcelain'], { encoding: 'utf8' }).trim()),
   identity: `${manifest.publisher}.${manifest.name}`,
   version: manifest.version,
   vsixSha256: createHash('sha256').update(await readFile(vsixPath)).digest('hex'),
   themes: manifest.contributes.themes.length,
   graphics: graphics.length,
   files: [...files.keys()].sort(),
   preserved,
};
await writeFile(reportPath, JSON.stringify(report, null, 2) + '\n');
console.log(`Verified ${files.size} VSIX entries: ${report.themes} themes, ${report.graphics} graphics and the original license.`);
