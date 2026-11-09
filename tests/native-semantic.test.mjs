import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { getTheme } from '../dist/core/src/index.js';
import { decodeTokens, zedStyle, realSession } from '../tooling/native-semantic-model.mjs';

test('native matrix accounts for every existing CI semantic case with valid core probes', () => {
  const read = path => JSON.parse(readFileSync(new URL(path, import.meta.url), 'utf8'));
  const groups = read('../ports/vscode/tests/semantic-ci.json');
  const probes = read('./native-semantic-probes.json');
  const expected = Object.values(groups).flatMap(group => group.languages).filter(key => key !== 'julia');
  assert.deepEqual(Object.keys(probes).sort(), expected.sort());
  const roles = getTheme('noctis').syntax;
  for (const [key, values] of Object.entries(probes)) {
    assert.ok(values.length, key);
    for (const probe of values) assert.ok(probe.text && probe.type && (probe.preserveSyntax || Object.hasOwn(roles, probe.role)), key);
  }
});

test('LSP decoding respects UTF-8 and UTF-16 offsets after non-ASCII text', () => {
  const legend = { tokenTypes: ['variable'], tokenModifiers: ['readonly'] };
  assert.equal(decodeTokens([0, 5, 1, 0, 1], legend, '😀 x', 'utf-8')[0].text, 'x');
  assert.equal(decodeTokens([0, 3, 1, 0, 1], legend, '😀 x', 'utf-16')[0].text, 'x');
  assert.throws(() => decodeTokens([], legend, ''), /Empty/);
  assert.throws(() => decodeTokens([1, 0, 1, 0, 0], legend, 'x'), /outside/);
});
test('Zed rules merge attributes and use exact style fallback order', () => {
  const syntax = { function: { color: '#fff', font_style: 'normal' }, definition: { color: '#abc' } };
  const token = { type: 'function', modifiers: ['declaration'] };
  assert.deepEqual(zedStyle(token, syntax, [
    { token_type: 'function', token_modifiers: ['declaration'], style: ['absent', 'definition'], font_weight: 'bold' },
    { token_type: 'function', style: ['function'] },
  ]), { color: '#abc', font_style: 'normal', font_weight: 700 });
  assert.deepEqual(zedStyle(token, syntax, [{ token_type: 'function' }, { style: ['function'] }]), {});
});
test('capture verification refuses stale or synthetic client evidence', () => {
  assert.throws(() => realSession([], 'fresh', 'zed'), /Stale/);
  assert.throws(() => realSession([{ direction: 'process', event: 'start', runId: 'fresh' },
    { direction: 'client', message: { method: 'initialize', params: { clientInfo: { name: 'test-client' } } } }], 'fresh', 'zed'), /Wrong native/);
});

test('a server restart cannot borrow a semantic reply from another process', () => {
  const entries = [];
  for (const pid of [100, 200]) {
    const add = (direction, message) => entries.push({ pid, direction, message });
    entries.push({ pid, direction: 'process', event: 'start', runId: 'restart' });
    add('client', { id: 0, method: 'initialize', params: { clientInfo: { name: 'Zed' } } });
    add('server', { id: 0, result: { capabilities: { semanticTokensProvider: {
      legend: { tokenTypes: ['variable'], tokenModifiers: [] }, full: true,
    } } } });
    add('client', { method: 'textDocument/didOpen', params: { textDocument: { uri: 'file:///sample', text: 'x' } } });
    if (pid === 100) add('client', { id: 1, method: 'textDocument/semanticTokens/full', params: { textDocument: { uri: 'file:///sample' } } });
    else add('server', { id: 1, result: { data: [0, 0, 1, 0, 0] } });
  }
  assert.throws(() => realSession(entries, 'restart', 'zed', 'file:///sample'), /No real full/);
  entries.push({ pid: 100, direction: 'server', message: { id: 1, result: { data: [0, 0, 1, 0, 0] } } });
  assert.equal(realSession(entries, 'restart', 'zed', 'file:///sample').tokens[0].text, 'x');
});
