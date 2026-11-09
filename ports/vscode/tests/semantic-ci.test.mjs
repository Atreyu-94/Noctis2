import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile, mkdtemp, writeFile, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { spawnSync } from 'node:child_process';
import YAML from 'yaml';
import { selectSemanticCases } from './semantic-ci-contract.mjs';
import { semanticModelVersion } from './semantic-style-model.mjs';

const readJSON = async name => JSON.parse(await readFile(new URL(name, import.meta.url), 'utf8'));

test('CI covers every proven semantic case once, plus the official Julia baseline', async () => {
  const [groups, matrix, probes, pins] = await Promise.all([
    readJSON('./semantic-ci.json'), readJSON('./semantic-providers.json'),
    readJSON('./semantic-probes.json'), readJSON('./semantic-provider-versions.json'),
  ]);
  assert.equal(pins.vscode, semanticModelVersion);
  const selected = Object.values(groups).flatMap(group => group.languages);
  assert.equal(new Set(selected).size, selected.length);
  assert.deepEqual(selected.slice().sort(), [...Object.keys(probes), 'julia'].sort());
  assert.equal(selected.length, 29);
  assert.ok(matrix.julia.textmateOnly);
  // Ionide's activation checks this optional pack member before starting FSAC.
  assert.ok(matrix.fsharp.supportExtensions.includes('ms-dotnettools.csharp'));
  for (const key of selected) {
    assert.ok(matrix[key]);
    for (const id of [matrix[key].provider, ...(matrix[key].supportExtensions ?? [])]) {
      if (!id.startsWith('vscode.')) assert.ok(pins.extensions[id], `Missing pin: ${id}`);
    }
  }
  for (const group of Object.values(groups)) {
    for (const runtime of group.runtimes) {
      const pin = pins.runtimes[runtime];
      assert.ok(pin?.version, runtime);
      if (runtime !== 'rust') assert.match(pin.sha256 ?? pin.sha512, /^(?:[a-f0-9]{64}|[a-f0-9]{128})$/);
    }
  }
  assert.equal(pins.runtimes.julia.version, pins.runtimes.jetls.julia);
  const workflow = YAML.parse(await readFile('.github/workflows/semantic-providers.yml', 'utf8'));
  assert.deepEqual(workflow.jobs.providers.strategy.matrix.group.slice().sort(), Object.keys(groups).sort());
  assert.equal(workflow.jobs.providers.strategy['fail-fast'], false);
  assert.ok(workflow.jobs.providers.steps.some(step => step.uses?.startsWith('actions/upload-artifact@') && step.if.includes('always()')));
  const validate = YAML.parse(await readFile('.github/workflows/validate.yml', 'utf8'));
  assert.ok(validate.jobs.package.needs.includes('semantic'));
});

test('semantic subset selection rejects unknown, empty and duplicate cases', () => {
  const matrix = { julia: {}, 'julia-jetls': {}, 'julia-fatou': {} };
  assert.deepEqual(selectSemanticCases(matrix, 'julia,julia-fatou'), ['julia', 'julia-fatou']);
  for (const input of ['', 'julia,', 'julia,julia', 'python']) {
    assert.throws(() => selectSemanticCases(matrix, input));
  }
});

test('CI audit cannot pass by reusing a capture from another run', async () => {
  const directory = await mkdtemp(join(tmpdir(), 'noctis-semantic-ci-'));
  try {
    // Deliberately invalid token content must never be examined from an old run.
    await writeFile(join(directory, 'capture-julia-fatou.json'), JSON.stringify({
      runId: 'old-run', capturedAt: '2026-11-09T00:00:00Z', extensions: {}, grammars: [],
      documents: [{ language: 'julia-fatou', status: 'tokens-captured', tokens: [{}] }],
    }));
    const result = spawnSync(process.execPath, ['ports/vscode/scripts/validate-semantic-providers.mjs',
      '--directory', directory, '--languages', 'julia-fatou', '--run-id', 'new-run', '--strict-pins'], { encoding: 'utf8' });
    assert.equal(result.status, 1, result.stderr);
    const report = JSON.parse(await readFile(join(directory, 'validation.json'), 'utf8'));
    assert.deepEqual(report.selectedCases, ['julia-fatou']);
    assert.deepEqual(report.incompleteProbeLanguages, ['julia-fatou']);
    assert.equal(report.checks, 0);
    assert.equal(report.matrix[0].validatedVariants.length, 0);
  } finally { await rm(directory, { recursive: true, force: true }); }
});
