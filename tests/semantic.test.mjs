import assert from 'node:assert/strict';
import { test } from 'node:test';
import COLORS from '../dist/colors.js';
import { createSemanticColors } from '../dist/createSemanticColors.js';
import { createLanguageSyntax } from '../dist/createLanguageSyntax.js';

test('semantic colors and language additions use only their own palette, in all 11 variants',()=>{
 for(const palette of Object.values(COLORS)){
  const allowed=new Set(Object.values(palette));
  for(const [selector,style] of Object.entries(createSemanticColors(palette))){
   assert.match(selector,/^(?:\*|[a-zA-Z]+)(?:\.[a-zA-Z]+)*(?::typst(?:-code)?)?$/);
   const color=typeof style==='string'?style:style.foreground;
   if(color!==undefined)assert.ok(allowed.has(color),`${selector}: color outside selected palette`);
  }
  for(const rule of createLanguageSyntax(palette)){
   if(rule.settings.foreground)assert.ok(allowed.has(rule.settings.foreground));
   for(const scope of rule.scope)assert.match(scope,/\.(?:typst|typst-code|julia)(?: |$)/);
  }
 }
});

test('Tinymist custom selectors are language-scoped and retain text fallback and combined emphasis',()=>{
 const rules=createSemanticColors(COLORS.noctis);
 for(const language of ['typst','typst-code']){
  assert.deepEqual(rules[`*.strong.emph:${language}`],{bold:true,italic:true});
  assert.equal(rules[`bool:${language}`],COLORS.noctis.number);
  assert.equal(rules[`ref:${language}`],COLORS.noctis.misc);
  assert.equal(rules[`label:${language}`],COLORS.noctis.constant);
  // Tinymist sends generic text over raw and math; do not hide TextMate coloring.
  assert.equal(rules[`text:${language}`],undefined);
 }
 for(const type of ['heading','marker','term','pol','bool','raw','text','ref'])assert.equal(rules[type],undefined);
 assert.equal(rules['*'],undefined);
 assert.equal(rules['*.strong'],undefined);
});

// Protect readable light-theme text without changing the original hue families.
test('light palettes meet normal-text contrast and retain their original hues', async () => {
 const { readFile } = await import('node:fs/promises');
 const baseline = JSON.parse(await readFile(new URL('./baseline.json', import.meta.url), 'utf8'));
 const rgb = hex => hex.slice(1).match(/../g).map(channel => parseInt(channel, 16) / 255);
 const luminance = hex => rgb(hex)
  .map(channel => channel <= 0.04045 ? channel / 12.92 : ((channel + 0.055) / 1.055) ** 2.4)
  .reduce((sum, channel, index) => sum + channel * [0.2126, 0.7152, 0.0722][index], 0);
 const hue = hex => {
  const [r, g, b] = rgb(hex), max = Math.max(r, g, b), min = Math.min(r, g, b), delta = max - min;
  if (delta === 0) return 0;
  const sector = max === r ? (g - b) / delta : max === g ? (b - r) / delta + 2 : (r - g) / delta + 4;
  return (sector * 60 + 360) % 360;
 };
 for (const [variant, original] of Object.entries(baseline.lightPalettes)) {
  const theme = JSON.parse(await readFile(new URL(`../themes/${variant}.json`, import.meta.url), 'utf8'));
  const background = luminance(theme.colors['editor.background']);
  for (const [role, color] of Object.entries(COLORS[variant])) {
   const foreground = luminance(color);
   const contrast = (Math.max(background, foreground) + 0.05) / (Math.min(background, foreground) + 0.05);
   assert.ok(contrast >= 4.5, `${variant}/${role}: ${contrast.toFixed(3)} contrast`);
   const difference = Math.abs(hue(color) - hue(original[role]));
   assert.ok(Math.min(difference, 360 - difference) <= 2, `${variant}/${role}: original hue changed`);
  }
  assert.notEqual(COLORS[variant].string, COLORS[variant].stringInterpolated);
  assert.notEqual(COLORS[variant].function, COLORS[variant].support);
 }
});
