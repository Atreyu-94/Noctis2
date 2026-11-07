import assert from 'node:assert/strict';
import { test } from 'node:test';
import { readFile } from 'node:fs/promises';
import Ajv from 'ajv';
import { renderFamily } from '../../../dist/ports/zed/src/build.js';
import { getTheme, variantIds } from '../../../dist/core/src/index.js';
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
