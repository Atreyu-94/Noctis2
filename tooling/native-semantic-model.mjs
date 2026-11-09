import assert from 'node:assert/strict';

// Zed c84af5b: SemanticTokenStylizer::new + editor::convert_token.
// Rules merge individual fields in reverse priority order; style names are exact.
export function zedStyle(token, syntax, rules) {
  const candidates = rules.filter(r => !r.token_type || r.token_type === token.type).toReversed();
  const matches = r => (r.token_modifiers ?? []).every(m => token.modifiers.includes(m));
  const fields = ['foreground_color', 'background_color', 'font_weight', 'font_style', 'underline', 'strikethrough'];
  const last = candidates.at(-1);
  if (!last || (matches(last) && !(last.style?.length || fields.some(f => last[f] != null)))) return {};
  const result = {};
  for (const rule of candidates.filter(matches)) {
    const style = (rule.style ?? []).map(name => syntax[name]).find(Boolean) ?? {};
    for (const field of fields) {
      const target = field === 'foreground_color' ? 'color' : field;
      let value = rule[field] ?? style[target];
      if (field === 'font_weight' && typeof value === 'string') value = value === 'bold' ? 700 : 400;
      if (value != null) result[target] = value;
    }
  }
  return result;
}

export function decodeTokens(data, legend, source, encoding = 'utf-16') {
  assert.ok(Array.isArray(data) && data.length > 0 && data.length % 5 === 0, 'Empty/malformed real token result');
  assert.ok(['utf-8', 'utf-16', 'utf-32'].includes(encoding), encoding);
  const lines = source.replaceAll('\r\n', '\n').split('\n');
  let row = 0, col = 0;
  const tokens = [];
  for (let i = 0; i < data.length; i += 5) {
    const [dr, dc, length, type, mask] = data.slice(i, i + 5);
    assert.ok([dr, dc, length, type, mask].every(n => Number.isSafeInteger(n) && n >= 0));
    row += dr; col = dr ? dc : col + dc;
    assert.ok(row < lines.length && legend.tokenTypes[type], 'Token outside source/legend');
    const units = encoding === 'utf-8' ? Buffer.from(lines[row]) : encoding === 'utf-32' ? [...lines[row]] : lines[row];
    assert.ok(col <= units.length, 'Token starts beyond line');
    const part = units.slice(col, col + length);
    const text = Array.isArray(part) ? part.join('') : part.toString();
    tokens.push({ row, col, length, type: legend.tokenTypes[type], text,
      modifiers: legend.tokenModifiers.filter((_, bit) => (mask & (2 ** bit)) !== 0),
      clippedEnd: col + length > units.length });
  }
  return tokens;
}

export function realSession(entries, runId, expectedClient, fileUri) {
  const starts = entries.filter(e => e.direction === 'process' && e.event === 'start');
  if (starts.length > 1) {
    // A normal settings reload restarts Zed's server. Never correlate reused
    // JSON-RPC IDs across different proxy processes.
    assert.ok(entries.every(e => e.pid != null), 'Restarted capture lacks process identity');
    let lastError;
    for (const start of starts.toReversed()) {
      try { return realSession(entries.filter(e => e.pid === start.pid), runId, expectedClient, fileUri); }
      catch (error) { lastError = error; }
    }
    throw lastError;
  }
  const start = entries.find(e => e.direction === 'process' && e.event === 'start');
  assert.equal(start?.runId, runId, 'Stale capture');
  const init = entries.find(e => e.direction === 'client' && e.message?.method === 'initialize')?.message;
  assert.ok(init?.params.clientInfo.name.toLowerCase().includes(expectedClient), 'Wrong native client');
  const response = entries.find(e => e.direction === 'server' && e.message?.id === init.id && e.message?.result?.capabilities)?.message.result;
  assert.ok(response, 'Missing initialize result');
  const registration = entries.flatMap(e => e.direction === 'server' && e.message?.method === 'client/registerCapability' ? e.message.params.registrations : [])
    .find(r => r.method === 'textDocument/semanticTokens');
  const capability = response.capabilities.semanticTokensProvider ?? registration?.registerOptions;
  assert.ok(capability?.legend, 'Missing semantic legend');
  const open = entries.find(e => e.direction === 'client' && e.message?.method === 'textDocument/didOpen'
    && (!fileUri || e.message.params.textDocument.uri === fileUri))?.message.params.textDocument;
  assert.ok(open, 'No native didOpen');
  const requests = new Set(entries.filter(e => e.direction === 'client' && e.message?.method === 'textDocument/semanticTokens/full'
    && e.message.params.textDocument.uri === open.uri).map(e => e.message.id));
  const result = entries.find(e => e.direction === 'server' && requests.has(e.message?.id) && e.message?.result?.data?.length)?.message.result;
  assert.ok(result, 'No real full semantic response for opened sample');
  return { start, client: init.params.clientInfo, server: response.serverInfo, capability, open,
    tokens: decodeTokens(result.data, capability.legend, open.text, response.capabilities.positionEncoding) };
}
