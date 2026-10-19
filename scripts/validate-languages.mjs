import assert from 'node:assert/strict';
import { readFile, mkdir, writeFile } from 'node:fs/promises';
import { createRequire } from 'node:module';
import { join } from 'node:path';
import { createHash } from 'node:crypto';
import tm from 'vscode-textmate';
import onig from 'vscode-oniguruma';
import COLORS from '../dist/colors.js';
const require = createRequire(import.meta.url);
const wasm = await readFile(require.resolve('vscode-oniguruma/release/onig.wasm'));
await onig.loadWASM(wasm.buffer.slice(wasm.byteOffset, wasm.byteOffset + wasm.byteLength));
const tiny = process.env.TINYMIST_EXTENSION, julia = process.env.JULIA_EXTENSION;
if (!tiny || !julia) throw new Error('Set TINYMIST_EXTENSION and JULIA_EXTENSION to installed extension directories.');
const sources = [
 {language:'typst', path:join(tiny,'out/typst.tmLanguage.json'), fixture:'tests/fixtures/highlighting.typ', extension:tiny,
  cases:[['Heading','misc'],['<intro>','constant'],['intro','misc'],['raw code','string'],['hello','string'],['true','number'],['$','keyword',13],['x','annotation',13],['^','keyword',13],['frac','function',13],['alpha','variable',13],['(','misc',13],[',','misc',13],['1','number',25],['where','string',25]]},
 {language:'julia', path:join(julia,'syntaxes/julia_vscode.json'), fixture:'tests/fixtures/highlighting.jl', extension:julia,
  cases:[['@info','misc'],['value=','string'],['sample','stringInterpolated',11],['true','number'],['Number','annotation']]},
];
const report=[];
for (const source of sources) {
 const grammarText=await readFile(source.path,'utf8');
 const raw=tm.parseRawGrammar(grammarText,source.path);
 const version=JSON.parse(await readFile(join(source.extension,'package.json'),'utf8')).version;
 const text=await readFile(source.fixture,'utf8');
 for (const [variant,palette] of Object.entries(COLORS)) {
  const theme=JSON.parse(await readFile(`themes/${variant}.json`,'utf8'));
  const registry=new tm.Registry({theme:{settings:[{settings:{foreground:theme.colors['editor.foreground'],background:theme.colors['editor.background']}},...theme.tokenColors]},onigLib:Promise.resolve({createOnigScanner:s=>new onig.OnigScanner(s),createOnigString:s=>new onig.OnigString(s)}),loadGrammar:async scope=>scope===raw.scopeName?raw:null});
  const grammar=await registry.loadGrammar(raw.scopeName);
  let stack=tm.INITIAL;const tokens=[];
  for (const [index,line] of text.split(/\r?\n/).entries()) {
   const scoped=grammar.tokenizeLine(line,stack),styled=grammar.tokenizeLine2(line,stack);
   for(const token of scoped.tokens){let metadata;for(let n=0;n<styled.tokens.length;n+=2){if(styled.tokens[n]<=token.startIndex)metadata=styled.tokens[n+1];}
    tokens.push({line:index+1,text:line.slice(token.startIndex,token.endIndex).trim(),scopes:token.scopes,color:registry.getColorMap()[(metadata>>>15)&511],style:(metadata>>>11)&15});}
   stack=scoped.ruleStack;
  }
  for(const [text,key,line] of source.cases){const token=tokens.find(t=>t.text===text && (line===undefined||t.line===line));assert.ok(token,`${source.language}: token ${text}`);assert.equal(token.color.toLowerCase(),palette[key].toLowerCase(),`${variant}/${source.language}/${text} scopes=${token.scopes}`);}
  report.push({language:source.language,version,variant,assertions:source.cases.length,grammarSha256:createHash('sha256').update(grammarText).digest('hex')});
  registry.dispose();
 }
}
await mkdir('test-results',{recursive:true});
await writeFile('test-results/language-validation.json',JSON.stringify(report,null,2));
console.log(`Passed ${report.reduce((s,r)=>s+r.assertions,0)} TextMate color assertions across ${report.length} language/variant combinations.`);
