import assert from 'node:assert/strict';
import { test } from 'node:test';
import COLORS from '../dist/colors.js';
import { createSemanticColors } from '../dist/createSemanticColors.js';

test('semantic colors use only their own palette, in all 11 variants',()=>{
 for(const palette of Object.values(COLORS)){
  const allowed=new Set(Object.values(palette));
  for(const [selector,style] of Object.entries(createSemanticColors(palette))){
   assert.match(selector,/^(?:\*|[a-zA-Z]+)(?:\.[a-zA-Z]+)*(?::typst(?:-code)?)?$/);
   const color=typeof style==='string'?style:style.foreground;
   if(color!==undefined)assert.ok(allowed.has(color),`${selector}: color outside selected palette`);
  }

 }
});
