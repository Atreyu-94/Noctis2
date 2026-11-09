const vscode = require('vscode');
const fs = require('node:fs/promises');
const path = require('node:path');
const crypto = require('node:crypto');
const delay = ms => new Promise(resolve => setTimeout(resolve, ms));
const deadline = (promise, ms, label) => {
  let timer;
  return Promise.race([promise, new Promise((_, reject) => {
    timer = setTimeout(() => reject(new Error(`${label}: timeout after ${ms}ms`)), ms);
  })]).finally(() => clearTimeout(timer));
};

exports.run = async () => {
  const config = JSON.parse(await fs.readFile(process.env.NOCTIS2_SEMANTIC_CONFIG, 'utf8'));
  const report = { runId: config.runId ?? null, vscodeVersion: vscode.version, capturedAt: new Date().toISOString(),
    source: 'VS Code extension-host commands with real providers', extensions: {}, grammars: [], documents: [] };
  for (const extension of vscode.extensions.all) {
    for (const grammar of extension.packageJSON.contributes?.grammars ?? []) {
      report.grammars.push({ ...grammar, path: path.join(extension.extensionPath, grammar.path),
        extension: extension.id, version: extension.packageJSON.version });
    }
    if (config.providers.includes(extension.id.toLowerCase()) || extension.packageJSON.contributes?.semanticTokenTypes
      || extension.packageJSON.contributes?.semanticTokenScopes) {
      report.extensions[extension.id.toLowerCase()] = { version: extension.packageJSON.version,
        semanticTokenTypes: extension.packageJSON.contributes?.semanticTokenTypes ?? [],
        semanticTokenModifiers: extension.packageJSON.contributes?.semanticTokenModifiers ?? [],
        semanticTokenScopes: extension.packageJSON.contributes?.semanticTokenScopes ?? [] };
    }
  }
  // A startup timeout may terminate the host mid-write; retain complete JSON.
  const save = async () => {
    await fs.writeFile(`${config.output}.tmp`, JSON.stringify(report, null, 2));
    await fs.rename(`${config.output}.tmp`, config.output);
  };
  await save();
  for (const item of config.documents) {
    const entry = { ...item, tokens: [], status: 'pending' };
    report.documents.push(entry);
    await save();
    try {
      const provider = vscode.extensions.getExtension(item.provider);
      if (!provider) { entry.status = 'provider-not-installed'; await save(); continue; }
      entry.providerVersion = provider.packageJSON.version;
      if (!provider.packageJSON.main && !provider.packageJSON.browser) {
        entry.status = 'declarative-extension-only';
        entry.note = 'Selected extension has no executable entry point; it cannot register a semantic provider itself.';
        await save();
        continue;
      }
      const uri = vscode.Uri.file(path.join(config.workspace, item.file));
      let document = await deadline(vscode.workspace.openTextDocument(uri), 30000, 'open document');
      if (document.languageId !== item.languageId) document = await vscode.languages.setTextDocumentLanguage(document, item.languageId);
      await deadline(vscode.window.showTextDocument(document, { preview: true, preserveFocus: true }), 30000, 'attach editor');
      const text = document.getText();
      entry.sampleSha256 = crypto.createHash('sha256').update(text.replace(/\r\n/g, '\n')).digest('hex');
      if (item.textmateOnly) {
        entry.status = 'textmate-only';
        entry.note = 'Official grammar baseline; no semantic requests are required for this case.';
        entry.active = provider.isActive;
        await save();
        continue;
      }
      await deadline(provider.activate(), Math.max(90000, item.waitMs ?? 0), `${item.provider} activation`);
      const started = Date.now();
      let legend, result, mode;
      // A server can register its provider after activate() has returned.
      while (Date.now() - started < (item.waitMs ?? 30000)) {
        legend = await deadline(vscode.commands.executeCommand('vscode.provideDocumentSemanticTokensLegend', uri), 15000, 'legend');
        if (legend) {
          try {
            // JETLS can still compile its first analysis after registering LSP.
            result = await deadline(vscode.commands.executeCommand('vscode.provideDocumentSemanticTokens', uri), item.requestTimeoutMs ?? 45000, 'tokens');
          } catch (error) {
            // C/C++ cancels requests while IntelliSense updates after opening a file.
            if (!/cancel/i.test(String(error))) throw error;
            (entry.cancelledRequests ??= []).push(String(error));
            await delay(1000);
            continue;
          }
          mode = 'document';
        } else {
          legend = await deadline(vscode.commands.executeCommand('vscode.provideDocumentRangeSemanticTokensLegend', uri), 15000, 'range legend');
          if (legend) {
            const range = new vscode.Range(document.positionAt(0), document.positionAt(text.length));
            result = await deadline(vscode.commands.executeCommand('vscode.provideDocumentRangeSemanticTokens', uri, range), item.requestTimeoutMs ?? 45000, 'range tokens');
            mode = 'range';
          }
        }
        if (legend && result?.data?.length) break;
        await delay(1000);
      }
      entry.legend = legend ?? null;
      entry.requestMode = mode ?? null;
      if (legend && result?.data?.length) {
        const data = Array.from(result.data);
        entry.rawData = data;
        if (data.length % 5) throw new Error('Invalid token data length');
        const lines = text.split(/\r?\n/);
        let row = 0, column = 0;
        for (let i = 0; i < data.length; i += 5) {
          const [deltaRow, deltaColumn, length, type, bits] = data.slice(i, i + 5);
          if (![deltaRow, deltaColumn, length, type, bits].every(n => Number.isInteger(n) && n >= 0)) throw new Error('Invalid token encoding');
          if (legend.tokenModifiers.length < 32 && bits >= 2 ** legend.tokenModifiers.length) throw new Error('Unknown semantic modifier bits');
          row += deltaRow; column = deltaRow ? deltaColumn : column + deltaColumn;
          if (!legend.tokenTypes[type] || !length || row >= lines.length || column > lines[row].length) throw new Error(`Invalid token range or type: ${JSON.stringify({row,column,length,type,lineLength:lines[row]?.length,tokenType:legend.tokenTypes[type]})}`);
          const modifiers = legend.tokenModifiers.filter((_, bit) => bits & (1 << bit));
          const visibleLength = Math.min(length, lines[row].length - column);
          if (visibleLength < length) {
            const offset = document.offsetAt(new vscode.Position(row, column));
            const overflow = text.slice(offset + visibleLength, offset + length);
            if (item.provider === 'sumneko.lua' && column + length === 9999) {
              // LuaLS splits multiline tokens with an end-of-line sentinel (9999).
              // Preserve raw coordinates while checking only visible characters.
              (entry.endOfLineTokens ??= []).push({ line: row + 1, column: column + 1, length, type: legend.tokenTypes[type], modifiers });
            } else {
              if (!/^\r?\n$/.test(overflow)) throw new Error('Semantic token extends beyond a line terminator');
              // Tinymist includes CRLF/LF in text tokens. Keep the raw ranges
              // in evidence, and validate the visible segment separately.
              (entry.lineTerminatorTokens ??= []).push({ line: row + 1, column: column + 1, length, type: legend.tokenTypes[type], modifiers });
            }
          }
          if (visibleLength) entry.tokens.push({ line: row + 1, column: column + 1, length: visibleLength,
            text: lines[row].slice(column, column + visibleLength), type: legend.tokenTypes[type], modifiers });
        }
        entry.status = 'tokens-captured';
      } else entry.status = 'no-semantic-tokens-observed';
      entry.diagnostics = vscode.languages.getDiagnostics(uri).map(d => ({ severity: d.severity, message: d.message }));
      entry.active = provider.isActive;
    } catch (error) { entry.status = 'provider-error'; entry.error = String(error.stack ?? error); }
    await save();
    console.log(`${entry.language}: ${entry.status}, ${entry.tokens.length} tokens`);
  }
};
