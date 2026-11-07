import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import { appendFile, copyFile, mkdir, readFile } from 'node:fs/promises';
import { resolve, join } from 'node:path';
import { pathToFileURL } from 'node:url';

export const repository = 'Atreyu-94/Noctis2';

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
   const [tag, destination] = process.argv.slice(2);
   assert.match(tag ?? '', /^v\d+\.\d+\.\d+$/, 'Expected a stable vX.Y.Z tag');
   assert.ok(destination, 'Usage: node scripts/verify-release.mjs <tag> <output-directory>');
   if (process.env.GITHUB_REPOSITORY) assert.equal(process.env.GITHUB_REPOSITORY, repository);
   const root = process.cwd();
   const run = (command, args, cwd = root) => execFileSync(command, args, { cwd, encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'] }).trim();
   const api = endpoint => JSON.parse(run('gh', ['api', `repos/${repository}/${endpoint}`]));
   const release = api(`releases/tags/${tag}`);
   assert.equal(release.draft, false);
   assert.equal(release.prerelease, false);
   const commit = run('git', ['rev-parse', `refs/tags/${tag}^{commit}`]);
   assert.match(commit, /^[a-f0-9]{40}$/);
   run('git', ['merge-base', '--is-ancestor', commit, 'origin/master']);
   const manifest = JSON.parse(run('git', ['show', `${commit}:package.json`]));
   const ci = api(`actions/workflows/validate.yml/runs?head_sha=${commit}&branch=master&event=push&status=success&per_page=100`)
      .workflow_runs.find(item => item.head_sha === commit && item.head_branch === 'master' && item.event === 'push' && item.conclusion === 'success');
   assert.ok(ci, 'No successful master push CI for the tagged commit');
   const output = resolve(destination);
   const releaseDir = join(output, 'release');
   const ciDir = join(output, 'ci');
   // Fresh directories make reruns fail closed rather than reuse stale downloads.
   await mkdir(output, { recursive: true });
   await mkdir(releaseDir);
   await mkdir(ciDir);
   const filename = `noctis2-${tag.slice(1)}.vsix`;
   run('gh', ['release', 'download', tag, '--repo', repository, '--pattern', filename, '--pattern', 'vsix-report.json', '--dir', releaseDir]);
   run('gh', ['run', 'download', String(ci.id), '--repo', repository, '--name', `noctis2-vsix-${commit}`, '--dir', ciDir]);
   const json = async path => JSON.parse(await readFile(path, 'utf8'));
   const report = await json(join(releaseDir, 'vsix-report.json'));
   const sha256 = validateRelease({ tag, release, manifest, commit, report,
      ciReport: await json(join(ciDir, 'vsix-report.json')),
      bytes: await readFile(join(releaseDir, filename)), ciBytes: await readFile(join(ciDir, 'noctis2.vsix')) });
   const source = join(output, 'source');
   run('git', ['-c', 'core.autocrlf=false', 'worktree', 'add', '--detach', source, commit]);
   try {
      run(process.execPath, [join(root, 'scripts/inspect-vsix.mjs'), join(releaseDir, filename), join(output, 'inspection.json')], source);
   } finally {
      run('git', ['worktree', 'remove', source]);
   }
   await copyFile(join(releaseDir, filename), join(output, 'noctis2.vsix'));
   await copyFile(join(releaseDir, 'vsix-report.json'), join(output, 'vsix-report.json'));
   if (process.env.GITHUB_STEP_SUMMARY) await appendFile(process.env.GITHUB_STEP_SUMMARY,
      `Verified **${tag}** at \`${commit}\` against [CI](${ci.html_url}).\n\nSHA-256: \`${sha256}\`\n`);
   console.log(`Verified ${tag}: ${commit}, SHA-256 ${sha256}`);
}

if (process.argv[1] && import.meta.url === pathToFileURL(resolve(process.argv[1])).href) await main();
