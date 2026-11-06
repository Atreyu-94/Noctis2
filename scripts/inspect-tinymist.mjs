import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { spawn } from 'node:child_process';
import { readFile, writeFile, mkdir } from 'node:fs/promises';
import { resolve } from 'node:path';
import { pathToFileURL } from 'node:url';
const executable = process.env.TINYMIST_BIN;
if (!executable) throw new Error('Set TINYMIST_BIN to the installed tinymist executable.');
const child = spawn(executable, ['lsp'], {stdio:['pipe','pipe','pipe']});
const timeout = setTimeout(() => { child.kill(); console.error('Tinymist timed out'); process.exitCode=1; }, 30000);
let next=0, buffer=Buffer.alloc(0);
const pending=new Map();
const send = object => { const data=Buffer.from(JSON.stringify(object)); child.stdin.write(`Content-Length: ${data.length}\r\n\r\n`); child.stdin.write(data); };
const request=(method,params)=>new Promise((resolve,reject)=>{const id=++next;pending.set(id,{resolve,reject});send({jsonrpc:'2.0',id,method,params});});
child.on('error', error=>{ for(const p of pending.values())p.reject(error); });
child.on('exit', ()=>{for(const p of pending.values())p.reject(new Error('Tinymist exited'));});
child.stderr.on('data', () => {});
child.stdout.on('data',chunk=>{
 buffer=Buffer.concat([buffer,chunk]);
 while(true){const end=buffer.indexOf('\r\n\r\n');if(end<0)return; const size=Number(/Content-Length: (\d+)/i.exec(buffer.subarray(0,end).toString())[1]);if(buffer.length<end+4+size)return;
 const msg=JSON.parse(buffer.subarray(end+4,end+4+size));buffer=buffer.subarray(end+4+size);
 if(msg.method && msg.id!==undefined) send({jsonrpc:'2.0',id:msg.id,result:msg.method==='workspace/configuration'?(msg.params.items??[]).map(()=>null):null});
 else if(pending.has(msg.id)){const p=pending.get(msg.id);pending.delete(msg.id);msg.error?p.reject(new Error(JSON.stringify(msg.error))):p.resolve(msg.result);}
 }
});
try {
 const rootUri=pathToFileURL(resolve('tests/fixtures')).href;
 const init=await request('initialize',{processId:process.pid,rootUri,capabilities:{textDocument:{semanticTokens:{requests:{full:true},tokenTypes:[],tokenModifiers:[],formats:['relative'],overlappingTokenSupport:false,multilineTokenSupport:false}}},initializationOptions:{semanticTokens:'enable',exportPdf:'never'}});
 send({jsonrpc:'2.0',method:'initialized',params:{}});
 const text=await readFile('tests/fixtures/highlighting.typ','utf8'),uri=pathToFileURL(resolve('tests/fixtures/highlighting.typ')).href;
 send({jsonrpc:'2.0',method:'textDocument/didOpen',params:{textDocument:{uri,languageId:'typst',version:1,text}}});
 const result=await request('textDocument/semanticTokens/full',{textDocument:{uri}});
 const legend=init.capabilities.semanticTokensProvider.legend;
 const lines=text.split(/\r?\n/), tokens=[];let line=0,col=0;
 for(let i=0;i<result.data.length;i+=5){const [dl,dc,length,type,bits]=result.data.slice(i,i+5);line+=dl;col=dl?dc:col+dc;tokens.push({line:line+1,text:lines[line].slice(col,col+length),type:legend.tokenTypes[type],modifiers:legend.tokenModifiers.filter((_,j)=>bits&(1<<j))});}
 const find = (text, line) => tokens.find(token => token.text === text && (line === undefined || token.line === line));
 assert.equal(find('true')?.type, 'bool');
 assert.equal(find('<intro>')?.type, 'label');
 assert.equal(find('@intro')?.type, 'ref');
 assert.deepEqual(find('both')?.modifiers, ['strong', 'emph']);
 assert.deepEqual(find('reverse')?.modifiers, ['strong', 'emph']);
 assert.deepEqual(find('frac', 23)?.modifiers, ['strong', 'emph', 'math']);
 assert.equal(find('frac', 23)?.type, 'function');
 assert.equal(find('function strong')?.type, 'text');
 assert.deepEqual(find('function strong')?.modifiers, []);
 for (const [text, type] of [['$', 'delim'], ['x', 'text'], ['^', 'operator'], ['frac', 'function'], ['alpha', 'pol']]) {
  assert.equal(find(text, 13)?.type, type);
  assert.ok(find(text, 13)?.modifiers.includes('math'));
 }
 assert.equal(find('1', 25)?.type, 'number');
 assert.equal(find('raw code')?.type, 'text');
 assert.equal(find('twice', 2)?.type, 'function');
 assert.equal(find('twice', 12)?.type, 'function');
 assert.ok(!find('twice', 2).modifiers.includes('declaration'));
 await mkdir('test-results',{recursive:true});
 await writeFile('test-results/tinymist-tokens.json',JSON.stringify({serverInfo:init.serverInfo,fixtureSha256:createHash('sha256').update(text.replace(/\r\n/g,'\n')).digest('hex'),legend,tokens},null,2));
 console.log(`Validated ${tokens.length} semantic tokens from ${init.serverInfo.name} ${init.serverInfo.version}.`);
 await request('shutdown',null);send({jsonrpc:'2.0',method:'exit'});
} finally { clearTimeout(timeout); child.kill(); }
