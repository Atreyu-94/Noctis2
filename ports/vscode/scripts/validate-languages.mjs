import { samplePath } from '../../../tests/sample-catalog.mjs';
import assert from 'node:assert/strict';
import { readFile, mkdir, writeFile } from 'node:fs/promises';
import { createRequire } from 'node:module';
import { join } from 'node:path';
import { createHash } from 'node:crypto';
import tm from 'vscode-textmate';
import onig from 'vscode-oniguruma';
import COLORS from '../../../dist/ports/vscode/src/colors.js';
const require = createRequire(import.meta.url);
const wasm = await readFile(require.resolve('vscode-oniguruma/release/onig.wasm'));
await onig.loadWASM(wasm.buffer.slice(wasm.byteOffset, wasm.byteOffset + wasm.byteLength));
const tiny = process.env.TINYMIST_EXTENSION, julia = process.env.JULIA_EXTENSION;
if (!tiny || !julia) throw new Error('Set TINYMIST_EXTENSION and JULIA_EXTENSION to installed extension directories.');
const sources = [
 {language:'typst', path:join(tiny,'out/typst.tmLanguage.json'), extension:tiny,
  cases:[['Notation','misc'],['<intro>','constant'],['intro','misc'],['raw code','string'],['hello','string'],['true','number'],['$','string',"$ x^2 + frac(1, 2) = alpha $"],['x','string',"$ x^2 + frac(1, 2) = alpha $"],['^','keyword',"$ x^2 + frac(1, 2) = alpha $"],['frac','function',"$ x^2 + frac(1, 2) = alpha $"],['alpha','variable',"$ x^2 + frac(1, 2) = alpha $"],['(','misc',"$ x^2 + frac(1, 2) = alpha $"],[',','misc',"$ x^2 + frac(1, 2) = alpha $"],['1','number',"$ #(1 + 2) + \"where\" $"],['where','string',"$ #(1 + 2) + \"where\" $"]]},
 {language:'julia', path:join(julia,'syntaxes/julia_vscode.json'), extension:julia,
  cases:[['@info','misc'],['value=','string'],['sample','stringInterpolated',"    text = \"value=$(sample.value)\""],['true','number'],['Number','annotation']]},
];
// Optional built-in grammars extend the same integration run without requiring an editor install in CI.
const builtin = process.env.VSCODE_EXTENSIONS;
if (builtin) {
 const pythonExtension = process.env.PYLANCE_EXTENSION || join(builtin, 'python');
 sources.push(
  {language:'python', path:join(pythonExtension, process.env.PYLANCE_EXTENSION ? 'grammars/PylancePython.tmLanguage' : 'syntaxes/MagicPython.tmLanguage.json'), extension:pythonExtension,
   cases:[['moved','function',"    def moved(self, distance: float) -> float:"],['identity','function',"def identity(value: T) -> T:"],['2','number',"SCALE: Final = 2"],['True','number',"enabled = True"]]},
  {language:'json', path:join(builtin,'json/syntaxes/JSON.tmLanguage.json'), extension:join(builtin,'json'),
   cases:[['name','variable',"    \"name\": \"Noctis2 observatory\","],['true','number',"    \"enabled\": true,"],['null','number',"    \"missing\": null,"],['42','number',"    \"count\": 42,"],['-1.5e2','number',"    \"ratio\": -1.5e2,"]]},
  {language:'markdown', path:join(builtin,'markdown-basics/syntaxes/markdown.tmLanguage.json'), extension:join(builtin,'markdown-basics'),
   cases:[['inline code','stringInterpolated',"[Example link](https://example.org) and `inline code`."],['double','function',"    def double(self, value: int) -> int:"],['2','number',"        return value * 2"],['true','number',"{\"enabled\": true, \"count\": 42, \"name\": \"sample\"}"],['42','number',"{\"enabled\": true, \"count\": 42, \"name\": \"sample\"}"]],
   styles:[['strong',2,"Plain text with **strong**, *emphasis*, and ***both***."],['emphasis',1,"Plain text with **strong**, *emphasis*, and ***both***."],['both',3,"Plain text with **strong**, *emphasis*, and ***both***."],['nested',3,"Also **_nested_** and _**reverse**_."],['reverse',3,"Also **_nested_** and _**reverse**_."]]},
 );
}
if (builtin) {
 for (const [language, extension, grammar, cases] of [
  ['typescript', 'typescript-basics', 'TypeScript.tmLanguage.json', [['2', 'number', '        y = 2;'], ['mapValue', 'function', '    export function mapValue<T>(value: T, transform: Mapper<T>): T {']]],
  ['tsx', 'typescript-basics', 'TypeScriptReact.tmLanguage.json', [['2', 'number', 'console.log(JSON.stringify(panel, null, 2));'], ['section', 'tag', '        <section className="observations">'], ['className', 'constant', '        <section className="observations">']]],
  ['lua', 'lua', 'lua.tmLanguage.json', [['2.5', 'number'], ['false', 'number'], ['DEFAULT_EXPOSURE', 'variable']]],
 ]) sources.push({ language, extension: join(builtin, extension), path: join(builtin, extension, 'syntaxes', grammar), cases });
}
// Resolve the embedded Python and JSON grammars used by the Markdown fixture.
const grammars = new Map();
for (const source of sources) {
 source.grammarText = await readFile(source.path, 'utf8');
 source.raw = tm.parseRawGrammar(source.grammarText, source.path);
 grammars.set(source.raw.scopeName, source.raw);
}
const report=[];
for (const source of sources) {
 const {grammarText, raw} = source;
 const version=JSON.parse(await readFile(join(source.extension,'package.json'),'utf8')).version;
 const text=await readFile(samplePath(source.language),'utf8');
 const lines=text.split(/\r?\n/);
 const lineOf = anchor => {
  if (anchor === undefined) return undefined;
  const matches = lines.flatMap((line, index) => line === anchor ? [index + 1] : []);
  assert.equal(matches.length, 1, `${source.language}: missing or ambiguous anchor ${anchor}`);
  return matches[0];
 };
 for (const [variant,palette] of Object.entries(COLORS)) {
  const theme=JSON.parse(await readFile(`ports/vscode/themes/${variant}.json`,'utf8'));
  const registry=new tm.Registry({theme:{settings:[{settings:{foreground:theme.colors['editor.foreground'],background:theme.colors['editor.background']}},...theme.tokenColors]},onigLib:Promise.resolve({createOnigScanner:s=>new onig.OnigScanner(s),createOnigString:s=>new onig.OnigString(s)}),loadGrammar:async scope=>grammars.get(scope)??null});
  const grammar=await registry.loadGrammar(raw.scopeName);
  let stack=tm.INITIAL;const tokens=[];
  for (const [index,line] of text.split(/\r?\n/).entries()) {
   const scoped=grammar.tokenizeLine(line,stack),styled=grammar.tokenizeLine2(line,stack);
   for(const token of scoped.tokens){let metadata;for(let n=0;n<styled.tokens.length;n+=2){if(styled.tokens[n]<=token.startIndex)metadata=styled.tokens[n+1];}
    tokens.push({line:index+1,text:line.slice(token.startIndex,token.endIndex).trim(),scopes:token.scopes,color:registry.getColorMap()[(metadata>>>15)&511],style:(metadata>>>11)&15});}
   stack=scoped.ruleStack;
  }
  for(const [text,key,anchor] of source.cases){const line=lineOf(anchor);const token=tokens.find(t=>t.text===text && (line===undefined||t.line===line));assert.ok(token,`${source.language}: token ${text}`);assert.equal(token.color.toLowerCase(),palette[key].toLowerCase(),`${variant}/${source.language}/${text} scopes=${token.scopes}`);}
  for (const [text, style, anchor] of source.styles ?? []) {
   const line = lineOf(anchor);
   const token = tokens.find(t => t.text === text && t.line === line);
   assert.ok(token, `${source.language}: styled token ${text}`);
   assert.equal(token.style & 3, style, `${variant}/${source.language}/${text}: emphasis lost`);
  }
  report.push({language:source.language,version,variant,assertions:source.cases.length+(source.styles?.length??0),grammarSha256:createHash('sha256').update(grammarText).digest('hex')});
  registry.dispose();
 }
}
await mkdir('test-results',{recursive:true});
await writeFile('test-results/language-validation.json',JSON.stringify(report,null,2));
console.log(`Passed ${report.reduce((s,r)=>s+r.assertions,0)} TextMate color/style assertions across ${report.length} language/variant combinations.`);
