import { graphics as listGraphics } from '../scripts/package-layout.mjs';
import assert from 'node:assert/strict';
import { execFileSync, spawnSync } from 'node:child_process';
import { createWriteStream } from 'node:fs';
import { mkdtemp, open, readFile, rm, mkdir, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join, dirname } from 'node:path';
import { pipeline } from 'node:stream/promises';
import { fileURLToPath } from 'node:url';
import { test } from 'node:test';
import yazl from 'yazl';

const root = fileURLToPath(new URL('../../../', import.meta.url));
const manifest = JSON.parse(await readFile(new URL('../package.json', import.meta.url), 'utf8'));
const namespace = 'http://schemas.microsoft.com/developer/vsx-schema/2011';
const identity = `<Identity Id="${manifest.name}" Publisher="${manifest.publisher}" Version="${manifest.version}"/>`;
const xml = `<PackageManifest xmlns="${namespace}"><Metadata>${identity}</Metadata></PackageManifest>`;
const graphics = await listGraphics(join(root, 'ports/vscode'));
const resources = [
   ['extension/package.json', 'package.json'], ['extension/readme.md', 'README.md'],
   ['extension/changelog.md', 'CHANGELOG.md'], ['extension/LICENSE.md', 'LICENSE.md'],
   ...manifest.contributes.themes.map(theme => [`extension/${theme.path.replace(/^\.\//, '')}`, theme.path]),
   ...graphics.map(path => [`extension/${path}`, path]),
];
const baseline = [
   ['[Content_Types].xml', Buffer.from('<Types/>')],
   ['extension.vsixmanifest', Buffer.from(xml)],
   ...await Promise.all(resources.map(async ([entry, source]) => [entry, await readFile(join(root, 'ports/vscode', source))])),
];

test('VSIX inspector accepts the package and rejects adversarial archives', async t => {
   const directory = await mkdtemp(join(tmpdir(), 'noctis2-vsix-'));
   let sequence = 0;
   const inspect = async (entries, error, layout = root) => {
      const archive = join(directory, `${sequence++}.vsix`);
      const report = `${archive}.json`;
      const zip = new yazl.ZipFile();
      const written = pipeline(zip.outputStream, createWriteStream(archive));
      for (const [name, bytes] of entries) zip.addBuffer(bytes, name);
      zip.end();
      await written;
      const result = spawnSync(process.execPath, [join(root, 'ports/vscode/scripts/inspect-vsix.mjs'), archive, report], {
         cwd: layout, encoding: 'utf8', timeout: 15000,
         env: { ...process.env, GIT_DIR: execFileSync('git', ['rev-parse', '--absolute-git-dir'], { cwd: root, encoding: 'utf8' }).trim(), GIT_WORK_TREE: layout },
      });
      assert.ifError(result.error);
      if (error) {
         assert.notEqual(result.status, 0);
         assert.match(result.stderr, error);
         await assert.rejects(readFile(report), { code: 'ENOENT' });
      } else {
         assert.equal(result.status, 0, result.stderr);
         assert.equal(JSON.parse(await readFile(report, 'utf8')).version, manifest.version);
      }
   };
   const withXml = value => baseline.map(([name, bytes]) => [name, name === 'extension.vsixmanifest' ? Buffer.from(value) : bytes]);
   try {
      await t.test('valid archive', () => inspect(baseline));
      await t.test('historical root layout remains inspectable', async () => {
         const legacy = join(directory, 'legacy');
         for (const [entry, source] of resources) {
            const filename = join(legacy, source);
            await mkdir(dirname(filename), { recursive: true });
            await writeFile(filename, baseline.find(([name]) => name === entry)[1]);
         }
         await inspect(baseline, undefined, legacy);
      });
      await t.test('identity with single-quoted attributes', () => inspect(withXml(xml.replaceAll('"', "'"))));
      await t.test('comment cannot disguise the wrong publisher', () => inspect(withXml(
         xml.replace(identity, `<!-- ${identity} -->${identity.replace(manifest.publisher, 'attacker')}`)
      ), /identity mismatch: Publisher/));
      await t.test('duplicate identity', () => inspect(withXml(xml.replace(identity, identity + identity)), /Duplicate VSIX identity/));
      await t.test('misplaced identity', () => inspect(withXml(xml.replace('<Metadata>', '<Metadata><Other>').replace('</Metadata>', '</Other></Metadata>')), /Misplaced VSIX identity/));
      await t.test('missing identity', () => inspect(withXml(xml.replace(identity, '')), /Missing VSIX identity/));
      await t.test('wrong namespace', () => inspect(withXml(xml.replace(namespace, 'urn:attacker')), /namespace/));
      await t.test('DTD', () => inspect(withXml(`<!DOCTYPE PackageManifest [<!ENTITY x "test">]>${xml}`), /DTD is forbidden/));
      await t.test('malformed XML', () => inspect(withXml(xml.replace('</Metadata>', '</Wrong>')), /Unexpected close tag/));
      await t.test('multiple XML roots', () => inspect(withXml(`${xml}<PackageManifest xmlns="${namespace}"/>`), /Multiple VSIX XML roots|Text data outside of root node/));
      await t.test('unexpected file', () => inspect([...baseline, ['extension/extra.js', Buffer.from('alert(1)')]], /entry count/));
      await t.test('duplicate file', () => inspect(baseline.map((entry, i) => i === 0 ? baseline[1] : entry), /Duplicate VSIX entry/));
      await t.test('changed theme', () => inspect(baseline.map(([name, bytes]) => [name, name === 'extension/themes/lux.json' ? Buffer.from('{}') : bytes]), /Packaged content changed/));
      await t.test('oversized expanded entry', () => inspect(baseline.map(([name, bytes], i) => [name, i === 0 ? Buffer.alloc(16 * 1024 * 1024 + 1) : bytes]), /entry exceeds size limit/));
      await t.test('oversized combined expanded data', () => {
         const large = Buffer.alloc(14 * 1024 * 1024);
         return inspect(baseline.map(([name, bytes], i) => [name, i < 5 ? large : bytes]), /expanded data exceeds size limit/);
      });
      await t.test('oversized archive rejected before ZIP parsing', async () => {
         const archive = join(directory, 'oversized.vsix');
         const file = await open(archive, 'w');
         try { await file.truncate(64 * 1024 * 1024 + 1); } finally { await file.close(); }
         const result = spawnSync(process.execPath, ['ports/vscode/scripts/inspect-vsix.mjs', archive, `${archive}.json`], { cwd: root, encoding: 'utf8', timeout: 15000 });
         assert.ifError(result.error);
         assert.notEqual(result.status, 0);
         assert.match(result.stderr, /archive exceeds size limit/);
      });
   } finally {
      await rm(directory, { recursive: true, force: true });
   }
});
