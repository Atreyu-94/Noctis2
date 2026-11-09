import { spawn } from 'node:child_process';
import { readFileSync, appendFileSync, mkdirSync } from 'node:fs';
import { dirname } from 'node:path';
import assert from 'node:assert/strict';

// Observe native editor traffic without changing requests, capabilities or replies.
const config = JSON.parse(readFileSync(process.argv[2], 'utf8'));
assert.ok(Array.isArray(config.command) && config.command.every(s => typeof s === 'string'));
assert.ok(config.command.length && typeof config.trace === 'string');
mkdirSync(dirname(config.trace), { recursive: true });
const record = entry => appendFileSync(config.trace, JSON.stringify({ at: new Date().toISOString(), pid: process.pid, ...entry }) + '\n');
record({ direction: 'process', event: 'start', pid: process.pid, command: config.command, case: config.case, runId: config.runId, sampleSha256: config.sampleSha256 });
const child = spawn(config.command[0], config.command.slice(1), {
  cwd: config.workspace, env: { ...process.env, ...config.env }, windowsHide: true, stdio: ['pipe', 'pipe', 'pipe'],
});
function observe(stream, direction) {
  let buffer = Buffer.alloc(0);
  stream.on('data', chunk => {
    buffer = Buffer.concat([buffer, chunk]);
    while (true) {
      const end = buffer.indexOf('\r\n\r\n');
      if (end < 0) break;
      const match = /^Content-Length:\s*(\d+)\s*$/im.exec(buffer.subarray(0, end).toString('ascii'));
      assert.ok(match, 'LSP frame missing Content-Length');
      const length = Number(match[1]);
      assert.ok(Number.isSafeInteger(length) && length <= 64 * 1024 * 1024, 'Invalid LSP length');
      if (buffer.length < end + 4 + length) break;
      record({ direction, message: JSON.parse(buffer.subarray(end + 4, end + 4 + length).toString('utf8')) });
      buffer = buffer.subarray(end + 4 + length);
    }
  });
}
observe(process.stdin, 'client');
observe(child.stdout, 'server');
process.stdin.pipe(child.stdin);
child.stdout.pipe(process.stdout);
child.stderr.on('data', bytes => appendFileSync(config.trace + '.stderr', bytes));
child.on('error', error => { record({ direction: 'process', event: 'error', error: String(error) }); process.exitCode = 1; });
child.on('exit', (code, signal) => { record({ direction: 'process', event: 'exit', code, signal }); process.exit(code ?? 1); });
process.stdin.on('end', () => child.stdin.end());
process.on('exit', () => { if (child.exitCode === null) child.kill(); });
