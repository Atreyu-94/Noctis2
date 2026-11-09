import assert from 'node:assert/strict';
import { test } from 'node:test';
import { readFile } from 'node:fs/promises';
import Ajv from 'ajv';
import { renderFamily } from '../../../dist/ports/zed/src/build.js';
import { getTheme, variantIds } from '../../../dist/core/src/index.js';
import { renderSemanticSettings } from '../../../dist/ports/zed/src/semantic.js';
import { zedStyle } from '../../../tooling/native-semantic-model.mjs';

test('semantic settings resolve provider-specific roles in all eleven palettes', async () => {
  const settings = renderSemanticSettings();
  assert.deepEqual(JSON.parse(await readFile(new URL('../semantic-settings.json', import.meta.url))), settings);
  assert.equal(settings.semantic_tokens, 'combined');
  const rules = settings.global_lsp_settings.semantic_token_rules;
  const cases = [
    ['function', ['declaration'], 'functionDeclaration'],
    ['method', ['declaration'], 'methodDeclaration'],
    ['variable', ['readonly'], 'constant'],
    ['property', ['readonly'], 'constant'],
    ['recordClass', [], 'type'], ['record', [], 'type'],
    ['tomlArrayKey', [], 'variable'], ['decorator', [], 'macro'],
    ['selfParameter', [], 'parameter'],
  ];
  for (const [index, theme] of renderFamily().themes.entries()) {
    const syntax = theme.style.syntax;
    for (const rule of rules) for (const name of rule.style ?? []) assert.ok(syntax[name], name);
    for (const [type, modifiers, role] of cases) {
      assert.equal(zedStyle({ type, modifiers }, syntax, rules).color,
        getTheme(variantIds[index]).syntax[role].foreground, `${theme.name}: ${type}/${role}`);
    }
    assert.deepEqual(zedStyle({ type: 'jetls.unspecified', modifiers: ['deprecated'] }, syntax, rules), {});
  }
});
test('all Zed variants validate against the vendored official schema', async () => {
  const schema = JSON.parse(await readFile(new URL('theme-schema.json', import.meta.url)));
  const validate = new Ajv({ strict: false, allErrors: true }).compile(schema);
  const family = renderFamily();
  assert.ok(validate(family), JSON.stringify(validate.errors));
  assert.equal(family.themes.length, 11);
  for (const [index, theme] of family.themes.entries()) {
    for (const key of Object.keys(theme.style)) {
      assert.ok(Object.hasOwn(schema.definitions.ThemeStyleContent.properties, key), `Unknown Zed style key: ${key}`);
    }
    const core = getTheme(variantIds[index]);
    assert.equal(theme.style['editor.background'], core.ui['surface.editor']);
    assert.equal(theme.style.syntax.function.color, core.syntax.function.foreground);
    assert.equal(theme.style.syntax['function.macro'].color, core.syntax.macro.foreground);
    assert.equal(theme.style.players[0].selection, core.ui['selection.editor']);
  }
  assert.deepEqual(JSON.parse(await readFile(new URL('../themes/noctis2.json', import.meta.url))), family);
});
