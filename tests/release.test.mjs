import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { test } from 'node:test';
import { validateRelease, missingReleaseAssets, releaseNotes } from '../scripts/verify-release.mjs';

function candidate() {
   const bytes = Buffer.from('verified VSIX');
   const report = { commit: 'a'.repeat(40), workingTreeDirty: false, identity: 'atreyu-94.noctis2', version: '0.1.1',
      vsixSha256: createHash('sha256').update(bytes).digest('hex') };
   return { tag: 'v0.1.1', release: { tag_name: 'v0.1.1', draft: false, prerelease: false },
      manifest: { name: 'noctis2', publisher: 'atreyu-94', version: '0.1.1' }, commit: report.commit,
      report, ciReport: structuredClone(report), bytes, ciBytes: Buffer.from(bytes) };
}

test('release verification accepts matching immutable inputs', () => {
   const input = candidate();
   assert.equal(validateRelease(input), input.report.vsixSha256);
});

for (const [name, change] of [
   ['unsafe tag', x => { x.tag = '../master'; }],
   ['different release tag', x => { x.release.tag_name = 'v0.1.2'; }],
   ['draft', x => { x.release.draft = true; }],
   ['prerelease', x => { x.release.prerelease = true; }],
   ['wrong publisher', x => { x.manifest.publisher = 'liviuschera'; }],
   ['version mismatch', x => { x.manifest.version = '0.1.2'; }],
   ['commit mismatch', x => { x.commit = 'b'.repeat(40); }],
   ['dirty checkout', x => { x.report.workingTreeDirty = true; }],
   ['missing clean flag', x => { delete x.report.workingTreeDirty; }],
   ['altered release report', x => { x.report.extra = 'modified'; }],
   ['altered VSIX', x => { x.bytes = Buffer.from('modified'); }],
   ['matching reports with invalid hash', x => { x.report.vsixSha256 = x.ciReport.vsixSha256 = '0'.repeat(64); }],
]) test(`release verification rejects ${name}`, () => {
   const input = candidate();
   change(input);
   assert.throws(() => validateRelease(input));
});

test('draft recovery only adds missing assets; a published release must be complete', () => {
   const names = ['noctis2-0.1.1.vsix', 'vsix-report.json'];
   const release = { draft: true, prerelease: false, assets: [{ name: names[0] }] };
   assert.deepEqual(missingReleaseAssets(release, names), [names[1]]);
   assert.throws(() => missingReleaseAssets({ ...release, draft: false }, names), /missing/);
   release.assets.push({ name: names[1] });
   assert.deepEqual(missingReleaseAssets({ ...release, draft: false }, names), []);
   release.assets.push({ name: names[0] });
   assert.throws(() => missingReleaseAssets(release, names), /Ambiguous/);
   assert.throws(() => missingReleaseAssets({ ...release, prerelease: true }, names), /Prereleases/);
});

test('notes use only the exact dated version section', () => {
   const changelog = '# Changelog\r\n\r\n## 0.1.10 (2026-11-06)\r\n\r\n- Later\r\n\r\n## 0.1.1 (2026-11-06)\r\n\r\n- Security\r\n\r\n## 0.1.0\r\n- Initial';
   assert.equal(releaseNotes(changelog, '0.1.1'), '- Security');
   assert.throws(() => releaseNotes(changelog, '0.1.2'), /Missing/);
   assert.throws(() => releaseNotes('## 0.1.1 (unreleased)\n- Pending', '0.1.1'), /Date/);
});
