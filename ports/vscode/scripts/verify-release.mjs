import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import { appendFile, copyFile, mkdir, readFile, writeFile } from 'node:fs/promises';
import { resolve, join } from 'node:path';
import { pathToFileURL } from 'node:url';

export const repository = 'Atreyu-94/Noctis2';

export function missingReleaseAssets(release, names) {
   assert.equal(release.prerelease, false, 'Prereleases cannot publish');
   const missing = names.filter(name => {
      const matches = release.assets.filter(asset => asset.name === name);
      assert.ok(matches.length <= 1, `Ambiguous release asset: ${name}`);
      return matches.length === 0;
   });
   assert.ok(release.draft || missing.length === 0, 'Published release is missing verified assets');
   return missing;
}

export function releaseNotes(changelog, version) {
   const lines = changelog.split(/\r?\n/);
   const start = lines.findIndex(line => line === `## ${version}` || line.startsWith(`## ${version} (`));
   assert.ok(start >= 0, 'Missing changelog section for release');
   assert.ok(!lines[start].includes('unreleased'), 'Date the changelog before tagging a release');
   const end = lines.findIndex((line, i) => i > start && line.startsWith('## '));
   return lines.slice(start + 1, end < 0 ? undefined : end).join('\n').trim();
}

export function validateRelease({ tag, release, manifest, commit, report, ciReport, bytes, ciBytes }) {
   assert.match(tag, /^v\d+\.\d+\.\d+$/, 'Expected a stable vX.Y.Z tag');
   assert.equal(release.tag_name, tag, 'Release tag mismatch');
   assert.equal(release.draft, false, 'Draft releases cannot publish');
   assert.equal(release.prerelease, false, 'Prereleases cannot publish');
   assert.equal(manifest.name, 'noctis2');
   assert.equal(manifest.publisher, 'atreyu-94');
   assert.equal(`v${manifest.version}`, tag, 'Tag and package version differ');
   assert.equal(report.commit, commit, 'Report commit mismatch');
   assert.equal(report.workingTreeDirty, false, 'Package must come from a clean checkout');
   assert.equal(report.identity, 'atreyu-94.noctis2');
   assert.equal(report.version, manifest.version, 'Report version mismatch');
   assert.deepEqual(report, ciReport, 'Release report differs from CI');
   assert.ok(bytes.equals(ciBytes), 'Release VSIX differs from CI');
   assert.equal(createHash('sha256').update(bytes).digest('hex'), report.vsixSha256, 'VSIX hash mismatch');
   return report.vsixSha256;
}

async function main() {
   const [tag, destination, mode = 'verify'] = process.argv.slice(2);
   assert.ok(['verify', 'prepare', 'create'].includes(mode), 'Unknown release operation');
   assert.match(tag ?? '', /^v\d+\.\d+\.\d+$/, 'Expected a stable vX.Y.Z tag');
   assert.ok(destination, 'Usage: node ports/vscode/scripts/verify-release.mjs <tag> <output-directory>');
   if (process.env.GITHUB_REPOSITORY) assert.equal(process.env.GITHUB_REPOSITORY, repository);
   const root = process.cwd();
   const run = (command, args, cwd = root) => execFileSync(command, args, { cwd, encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'] }).trim();
   const api = endpoint => JSON.parse(run('gh', ['api', `repos/${repository}/${endpoint}`]));
   const commit = run('git', ['rev-parse', `refs/tags/${tag}^{commit}`]);
   assert.match(commit, /^[a-f0-9]{40}$/);
   run('git', ['merge-base', '--is-ancestor', commit, 'origin/master']);
   const prefix = run('git', ['ls-tree', '--name-only', commit, 'ports/vscode/package.json']) ? 'ports/vscode/' : '';
   const manifest = JSON.parse(run('git', ['show', `${commit}:${prefix}package.json`]));
   assert.equal(`v${manifest.version}`, tag, 'Tag and package version differ');
   // A tag can arrive while the master push is still being validated.
   let ci;
   const deadline = Date.now() + (mode === 'verify' ? 0 : 15 * 60 * 1000);
   do {
      const runs = api(`actions/workflows/validate.yml/runs?head_sha=${commit}&branch=master&event=push&per_page=100`)
         .workflow_runs.filter(item => item.head_sha === commit && item.head_branch === 'master' && item.event === 'push');
      ci = runs.find(item => item.conclusion === 'success');
      if (ci) break;
      assert.ok(!runs.length || runs.some(item => item.status !== 'completed'), 'Master CI failed; fix it before releasing');
      assert.ok(Date.now() < deadline, 'No successful master push CI for the tagged commit');
      console.log('Waiting for master CI of the tagged commit...');
      await new Promise(resolve => setTimeout(resolve, 15000));
   } while (!ci);
   const output = resolve(destination);
   const releaseDir = join(output, 'release');
   const ciDir = join(output, 'ci');
   // Fresh directories make reruns fail closed rather than reuse stale downloads.
   await mkdir(output, { recursive: true });
   await mkdir(releaseDir);
   await mkdir(ciDir);
   const filename = `noctis2-${tag.slice(1)}.vsix`;
   run('gh', ['run', 'download', String(ci.id), '--repo', repository, '--name', `noctis2-vsix-${commit}`, '--dir', ciDir]);
   const json = async path => JSON.parse(await readFile(path, 'utf8'));
   const ciReport = await json(join(ciDir, 'vsix-report.json'));
   const ciBytes = await readFile(join(ciDir, 'noctis2.vsix'));
   const inputs = { tag, manifest, commit, ciReport, ciBytes };
   const sha256 = validateRelease({ ...inputs, release: { tag_name: tag, draft: false, prerelease: false },
      report: ciReport, bytes: ciBytes });
   const source = join(output, 'source');
   run('git', ['-c', 'core.autocrlf=false', 'worktree', 'add', '--detach', source, commit]);
   try {
      run(process.execPath, [join(root, 'ports/vscode/scripts/inspect-vsix.mjs'), join(ciDir, 'noctis2.vsix'), join(output, 'inspection.json')], source);
   } finally {
      run('git', ['worktree', 'remove', source]);
   }
   await copyFile(join(ciDir, 'noctis2.vsix'), join(output, filename));
   await copyFile(join(ciDir, 'vsix-report.json'), join(output, 'vsix-report.json'));
   if (mode !== 'verify') {
      const notes = releaseNotes(run('git', ['show', `${commit}:${prefix}CHANGELOG.md`]), manifest.version);
      await writeFile(join(output, 'release-notes.md'), `${notes}\n\nValidated [CI](${ci.html_url}) for \`${commit}\`.\n\nVSIX SHA-256: \`${sha256}\`\n`);
   }
   if (mode !== 'prepare') {
      let release;
      try { release = api(`releases/tags/${tag}`); } catch (error) {
         if (mode !== 'create' || !String(error.stderr).includes('HTTP 404')) throw error;
         run('gh', ['release', 'create', tag, join(output, filename), join(output, 'vsix-report.json'),
            '--repo', repository, '--verify-tag', '--draft', '--title', `Noctis2 ${manifest.version}`, '--notes-file', join(output, 'release-notes.md')]);
         release = api(`releases/tags/${tag}`);
      }
      assert.equal(release.tag_name, tag);
      const missing = missingReleaseAssets(release, [filename, 'vsix-report.json']);
      if (mode === 'create' && missing.length) {
         // Resume an interrupted draft without replacing any existing attachment.
         run('gh', ['release', 'upload', tag, ...missing.map(name => join(output, name)), '--repo', repository]);
      }
      run('gh', ['release', 'download', tag, '--repo', repository, '--pattern', filename, '--pattern', 'vsix-report.json', '--dir', releaseDir]);
      validateRelease({ ...inputs, release: mode === 'create' ? { ...release, draft: false } : release,
         report: await json(join(releaseDir, 'vsix-report.json')), bytes: await readFile(join(releaseDir, filename)) });
      if (mode === 'create' && release.draft) {
         run('gh', ['release', 'edit', tag, '--repo', repository, '--draft=false']);
         assert.equal(api(`releases/tags/${tag}`).draft, false, 'Release did not become public');
      }
   }
   await copyFile(join(output, filename), join(output, 'noctis2.vsix'));
   if (process.env.GITHUB_STEP_SUMMARY) await appendFile(process.env.GITHUB_STEP_SUMMARY,
      `Verified **${tag}** at \`${commit}\` against [CI](${ci.html_url}).\n\nSHA-256: \`${sha256}\`\n`);
   console.log(`Verified ${tag}: ${commit}, SHA-256 ${sha256}`);
}

if (process.argv[1] && import.meta.url === pathToFileURL(resolve(process.argv[1])).href) await main();
