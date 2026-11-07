import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { test } from 'node:test';
import { validateRelease } from '../scripts/verify-release.mjs';

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
