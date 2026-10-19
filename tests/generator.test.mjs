import assert from 'node:assert/strict';
import { test } from 'node:test';
import { createHash } from 'node:crypto';
import { mkdtemp, readFile, readdir, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { spawnSync } from 'node:child_process';
import { createSyntax } from '../dist/createSyntax.js';
import COLORS from '../dist/colors.js';

const root = fileURLToPath(new URL('../', import.meta.url));
const baseline = JSON.parse(await readFile(new URL('./baseline.json', import.meta.url), 'utf8'));
const manifest = JSON.parse(await readFile(new URL('../package.json', import.meta.url), 'utf8'));
const hash = text => createHash('sha256').update(text.replace(/\r\n/g, '\n')).digest('hex');
const run = directory => spawnSync(process.execPath, ['dist/build.js', directory], {cwd:root, encoding:'utf8'});

test('all 11 themes preserve upstream content except documented corrections', async () => {
 assert.equal(baseline.themes.length, 11);
 assert.deepEqual(manifest.contributes.themes, baseline.themes.map(({sha256, ...entry}) => ({...entry, label: entry.label.replace(/^Noctis\b/, 'Noctis2')})));
 const directory = await mkdtemp(join(tmpdir(), 'noctis2-equivalence-'));
 try {
  for (let pass = 0; pass < 2; pass++) {
   const result = run(directory);
   assert.equal(result.status, 0, result.stderr);
   assert.equal((await readdir(directory)).length, 11);
   for (const entry of baseline.themes) {
    const filename = entry.path.split('/').at(-1);
    const generated = await readFile(join(directory, filename), 'utf8');
    const parsed = JSON.parse(generated);
    const { semanticHighlighting, semanticTokenColors, ...legacy } = parsed;
    assert.equal(parsed.name, entry.label.replace(/^Noctis\b/, 'Noctis2'));
    legacy.name = entry.label;
    legacy.tokenColors = legacy.tokenColors.slice(0, 19);
    const legacyColorKeys = {
     'editorIndentGuide.background1': 'editorIndentGuide.background',
     'editorIndentGuide.activeBackground1': 'editorIndentGuide.activeBackground',
     'welcomePage.tileBackground': 'welcomePage.buttonBackground',
     'welcomePage.tileHoverBackground': 'welcomePage.buttonHoverBackground'
    };
    for (const [current, previous] of Object.entries(legacyColorKeys)) {
     assert.ok(Object.hasOwn(parsed.colors, current));
     assert.equal(Object.hasOwn(parsed.colors, previous), false);
    }
    // Restore key names only; the upstream hash still checks exact values and order.
    legacy.colors = Object.fromEntries(Object.entries(legacy.colors)
     .map(([key, value]) => [legacyColorKeys[key] ?? key, value]));
    if (filename === 'lilac.json') {
     assert.equal(parsed.type, 'light');
     assert.equal(parsed.colors['inputValidation.infoBackground'], '#dedbf5');
     assert.equal(parsed.colors['inputValidation.infoBackground'], parsed.colors['editorWidget.background']);
     // Restore only the two authorized Lilac corrections for the immutable baseline comparison.
     legacy.colors = { ...legacy.colors, 'inputValidation.infoBackground': '#00c6ea599ff' };
     legacy.type = 'dark';
    }
    assert.equal(hash(JSON.stringify(legacy, null, 3)), entry.sha256, `${filename}: upstream palette or legacy rule changed`);
    assert.equal(semanticHighlighting, true);
    assert.ok(Object.keys(semanticTokenColors).length > 0);
    assert.deepEqual(JSON.parse(await readFile(join(root, entry.path), 'utf8')), parsed, `${filename}: stale generated file`);
    const theme = JSON.parse(generated);
    assert.equal(theme.type, entry.uiTheme === 'vs' ? 'light' : 'dark');
    for (const color of Object.values(theme.colors)) {
     assert.match(color, /^#(?:[\da-f]{3}|[\da-f]{4}|[\da-f]{6}|[\da-f]{8})$/i);
    }
   }
  }
 } finally { await rm(directory, {recursive:true, force:true}); }
});

test('palettes and returned syntax do not leak mutations across calls', () => {
 const first = createSyntax(COLORS.bordo);
 const expected = structuredClone(first);
 createSyntax(COLORS.lux);
 assert.deepEqual(first, expected);
 first[0].settings.foreground = '#000000';
 first[0].scope.push('test.only');
 assert.deepEqual(createSyntax(COLORS.bordo), expected);
});

test('a failed theme write produces a failing process exit code', async () => {
 const directory = await mkdtemp(join(tmpdir(), 'noctis2-write-failure-'));
 try {
  // A directory at the first theme file path forces a real write failure.
  const { mkdir } = await import('node:fs/promises');
  await mkdir(join(directory, 'lux.json'));
  const result = run(directory);
  assert.notEqual(result.status, 0);
  assert.match(result.stderr, /EISDIR|EPERM|EACCES/);
 } finally { await rm(directory, {recursive:true, force:true}); }
});
