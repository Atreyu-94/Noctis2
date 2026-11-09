import assert from 'node:assert/strict';
import { test } from 'node:test';
import { readFileSync } from 'node:fs';
import { createSemanticStyleModel } from './semantic-style-model.mjs';
import { getTheme, variantIds } from '../../../dist/core/src/index.js';

// Real Pylance and C/C++ contribution shapes; no synthetic language provider.
const extensions = { pylance: { semanticTokenTypes: [{ id: 'module', superType: 'namespace' }, { id: 'selfParameter', superType: 'parameter' }],
  semanticTokenScopes: [{ language: 'python', scopes: { 'string.escapeCharacter': ['constant.character.escape.python'] } }] },
  cpp: { semanticTokenTypes: [{ id: 'templateFunction', superType: 'function' }] } };
test('semantic model resolves real provider subtypes, modifier specificity and partial styles', () => {
  for (const id of variantIds) {
    const theme = JSON.parse(readFileSync(new URL(`../themes/${id}.json`, import.meta.url)));
    const resolve = createSemanticStyleModel(theme, extensions);
    const syntax = getTheme(id).syntax;
    for (const [type, modifiers, languageId, role] of [
      ['module', [], 'python', 'namespace'], ['selfParameter', [], 'python', 'parameter'],
      ['templateFunction', [], 'cpp', 'function'], ['property', ['declaration', 'readonly'], 'typescript', 'constant'],
      ['function', ['declaration'], 'typescript', 'functionDeclaration'],
    ]) assert.equal(resolve({ type, modifiers, languageId }).style.foreground, syntax[role].foreground);
    const emphasis = resolve({ type: 'text', modifiers: ['strong', 'emph'], languageId: 'typst' }).style;
    assert.equal(emphasis.bold, true); assert.equal(emphasis.italic, true);
    assert.equal(resolve({ type: 'text', modifiers: ['strong', 'emph'], languageId: 'python' }).style.bold, undefined);
  }
});
test('Pylance escapes use the core escape role only in Python, across all variants', () => {
 for (const id of variantIds) {
  const theme = JSON.parse(readFileSync(new URL(`../themes/${id}.json`, import.meta.url)));
  const token = { type: 'string', modifiers: ['escapeCharacter'], languageId: 'python' };
  const current = createSemanticStyleModel(theme, extensions)(token);
  assert.equal(current.provenance.foreground.selector, 'string.escapeCharacter:python');
  assert.equal(current.style.foreground, getTheme(id).syntax.escape.foreground);
  for (const other of [{ ...token, modifiers: [] }, { ...token, languageId: 'typescript' }]) {
    assert.equal(createSemanticStyleModel(theme, extensions)(other).style.foreground, getTheme(id).syntax.string.foreground);
  }
  delete theme.semanticTokenColors['string.escapeCharacter:python'];
  assert.notEqual(createSemanticStyleModel(theme, extensions)(token).style.foreground, getTheme(id).syntax.escape.foreground);
  delete theme.semanticTokenColors.string;
  const fallback = createSemanticStyleModel(theme, extensions)(token);
  assert.equal(fallback.provenance.foreground.kind, 'scope-fallback');
  assert.equal(fallback.style.foreground, getTheme(id).syntax.escape.foreground);
 }
});
