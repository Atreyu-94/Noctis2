import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import { on } from 'node:events';
import { readFile, writeFile } from 'node:fs/promises';
import { promisify } from 'node:util';
import yauzl from 'yauzl';

const [vsixPath, reportPath] = process.argv.slice(2);
if (!vsixPath || !reportPath) throw new Error('Usage: node scripts/inspect-vsix.mjs <package.vsix> <report.json>');

const manifest = JSON.parse(await readFile('package.json', 'utf8'));
assert.equal(manifest.contributes.themes.length, 11, 'Expected all eleven themes');
const graphics = execFileSync('git', ['ls-files', '-z', '--', 'images'], { encoding: 'utf8' })
   .split('\0').filter(path => /\.(png|svg)$/.test(path) && !path.split('/').at(-1).startsWith('._'));
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
const zip = await promisify(yauzl.open)(vsixPath, { lazyEntries: true });
try {
   const entries = on(zip, 'entry', { close: ['end'] });
   zip.readEntry();
   for await (const [entry] of entries) {
      assert.ok(allowed.has(entry.fileName), `Unexpected VSIX entry: ${entry.fileName}`);
      assert.ok(!files.has(entry.fileName), `Duplicate VSIX entry: ${entry.fileName}`);
      const stream = await promisify(zip.openReadStream.bind(zip))(entry);
      const chunks = [];
      for await (const chunk of stream) chunks.push(chunk);
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
   assert.ok(bytes.equals(await readFile(source)), `Packaged content changed: ${source}`);
   preserved.push({ path: source, sha256: createHash('sha256').update(bytes).digest('hex') });
}
const xml = files.get('extension.vsixmanifest').toString('utf8');
for (const [key, value] of Object.entries({ Id: manifest.name, Publisher: manifest.publisher, Version: manifest.version })) {
   assert.ok(xml.includes(`${key}="${value}"`), `VSIX identity mismatch: ${key}`);
}
const report = {
   commit: execFileSync('git', ['rev-parse', 'HEAD'], { encoding: 'utf8' }).trim(),
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
