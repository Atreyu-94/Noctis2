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
   for(const scope of rule.scope)assert.match(scope,/\.(?:typst|typst-code|julia|markdown)(?: |$)/);
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
  // Plain/raw text keeps fallback; math is styled only within its own context.
  assert.equal(rules[`text:${language}`],undefined);
 }
 for(const type of ['heading','marker','term','pol','bool','raw','text','ref'])assert.equal(rules[type],undefined);
 assert.equal(rules['*.math'],undefined);
 assert.equal(rules['*'],undefined);
 assert.equal(rules['*.strong'],undefined);
});
