import assert from 'node:assert/strict';
import { readFile, readdir, writeFile } from 'node:fs/promises';
import { createHash } from 'node:crypto';
import { createRequire } from 'node:module';
import { parseArgs } from 'node:util';
import { selectSemanticCases } from '../tests/semantic-ci-contract.mjs';
import tm from 'vscode-textmate';
import onig from 'vscode-oniguruma';
import { catalog, samplePath } from '../../../tests/sample-catalog.mjs';
import { createSemanticStyleModel, semanticModelVersion } from '../tests/semantic-style-model.mjs';
import { getTheme, variantIds } from '../../../dist/core/src/index.js';

const { values: options } = parseArgs({ options: {
  directory: { type: 'string', default: 'test-results/semantic-providers' },
  languages: { type: 'string' }, 'run-id': { type: 'string' }, 'strict-pins': { type: 'boolean', default: false },
} });
const directory = options.directory;
const matrix = JSON.parse(await readFile('ports/vscode/tests/semantic-providers.json', 'utf8'));
const probes = JSON.parse(await readFile('ports/vscode/tests/semantic-probes.json', 'utf8'));
assert.deepEqual([...new Set(Object.entries(matrix).map(([key, config]) => config.sample ?? key))].sort(), Object.keys(catalog).sort());
const selected = selectSemanticCases(matrix, options.languages);
const pins = JSON.parse(await readFile('ports/vscode/tests/semantic-provider-versions.json', 'utf8'));
assert.equal(pins.vscode, semanticModelVersion, 'Review the semantic style model before updating VS Code');
const captures = [];
for (const file of await readdir(directory)) {
  if (/^capture(?:-[a-z-]+)?\.json$/.test(file)) {
    const capture = JSON.parse(await readFile(`${directory}/${file}`, 'utf8'));
    if (options['run-id'] && capture.runId !== options['run-id']) continue;
    if (capture.documents.some(doc => selected.includes(doc.language))) captures.push(capture);
  }
}

captures.sort((a, b) => a.capturedAt.localeCompare(b.capturedAt));
const latest = new Map(), extensions = {}, grammarMetadata = new Map(), rootScopes = new Map();
for (const capture of captures) {
  Object.assign(extensions, capture.extensions);
  for (const grammar of capture.grammars ?? []) {
    grammarMetadata.set(grammar.scopeName, grammar);
    // A scope can serve multiple language IDs (Terraform and HCL, for example).
    if (grammar.language) rootScopes.set(grammar.language, grammar.scopeName);
  }
  for (const document of capture.documents) latest.set(document.language, { ...document, vscodeVersion: capture.vscodeVersion, capturedAt: capture.capturedAt });
}

const grammars = new Map(), grammarHashes = {};
async function loadInstalledGrammar(scope) {
  if (grammars.has(scope)) return grammars.get(scope);
  const entry = grammarMetadata.get(scope);
  if (!entry) { missing.add(scope); return null; }
  const text = await readFile(entry.path, 'utf8');
  grammars.set(scope, tm.parseRawGrammar(text, entry.path));
  grammarHashes[scope] = { extension: entry.extension, version: entry.version, sha256: createHash('sha256').update(text).digest('hex') };
  return grammars.get(scope);
}
const require = createRequire(import.meta.url);
const wasm = await readFile(require.resolve('vscode-oniguruma/release/onig.wasm'));
await onig.loadWASM(wasm.buffer.slice(wasm.byteOffset, wasm.byteOffset + wasm.byteLength));
const report = { runId: options['run-id'] ?? null, selectedCases: selected, scope: 'real provider tokens; offline VS Code selector/fallback model; not renderer acceptance',
  matrix: [], grammarHashes, checks: 0, roleChecks: 0, syntacticFallbackChecks: 0, textmateResults: [], findings: [], combinations: [], missingGrammarScopes: [], plainTextFallbackLanguages: [] };
const missing = new Set();
try {
for (const language of selected) {
  const config = matrix[language];
  const capture = latest.get(language);
  const row = { language, validatedVariants: [], provider: config.provider, version: capture?.providerVersion ?? null,
    status: capture?.status === 'pending' ? 'capture-incomplete' : capture?.status ?? (config.candidate ? 'candidate-not-tested' : 'provider-selection-pending'), tokenCount: capture?.tokens?.length ?? 0,
    vscodeVersion: capture?.vscodeVersion ?? null, error: capture?.error ?? null,
    note: capture?.note ?? config.note ?? null,
    errorDiagnosticCount: capture?.diagnostics?.filter(d => d.severity === 0).length ?? 0,
    candidate: config.candidate ?? null, lineTerminatorTokenCount: capture?.lineTerminatorTokens?.length ?? 0,
    endOfLineTokenCount: capture?.endOfLineTokens?.length ?? 0 };
  report.matrix.push(row);
  if (row.status !== 'tokens-captured' && (!config.textmateOnly || !capture?.sampleSha256)) continue;
  assert.ok(capture?.sampleSha256, `${language}: missing source capture for grammar validation`);
  assert.equal(capture.provider, config.provider, `${language}: capture belongs to a different provider`);
  assert.equal(capture.providerVersion, extensions[capture.provider]?.version, `${language}: provider metadata changed; recapture`);
  if (options['strict-pins'] && !config.provider.startsWith('vscode.')) {
    assert.equal(capture.providerVersion, pins.extensions[config.provider], `${language}: unpinned provider version`);
  }
  assert.equal(capture.vscodeVersion, pins.vscode, 'Review the pinned style model before validating another VS Code version');
  const text = await readFile(samplePath(config.sample ?? language), 'utf8');
  assert.equal(createHash('sha256').update(text.replace(/\r\n/g, '\n')).digest('hex'), capture.sampleSha256, `${language}: stale sample capture`);
  const lines = text.split(/\r?\n/);
  const rootScope = rootScopes.get(config.languageId);
  if ((config.sample ?? language) === 'julia') {
    assert.equal(grammarMetadata.get(rootScope)?.extension.toLowerCase(), 'julialang.language-julia',
      `${language}: retain the official Julia TextMate grammar`);
  }
  // Cucumber contributes semantic tokens without a TextMate grammar. VS Code
  // uses the editor foreground as its syntactic base in that configuration.
  if (!rootScope) report.plainTextFallbackLanguages.push(language);
  for (const id of variantIds) {
    const theme = JSON.parse(await readFile(`ports/vscode/themes/${id}.json`, 'utf8'));
    const model = createSemanticStyleModel(theme, extensions);
    for (const probe of probes[language] ?? []) {
      const token = capture.tokens.find(token => token.text === probe.text && token.type === probe.type && probe.modifiers.every(mod => token.modifiers.includes(mod)));
      assert.ok(token, `${language}: missing real token ${probe.text}/${probe.type}`);
      const actual = model({ ...token, languageId: config.languageId }).style;
      if (probe.preserveSyntax) {
        assert.deepEqual(actual, {}, `${language}/${id}/${probe.text}: retain syntactic styling`);
        report.roleChecks++;
        continue;
      }
      for (const [property, value] of Object.entries(getTheme(id).syntax[probe.role])) {
        assert.equal(actual[property], value, `${language}/${id}/${probe.text}: ${property}`);
        report.roleChecks++;
      }
    }
    const registry = new tm.Registry({ theme: { settings: [{ settings: { foreground: theme.colors['editor.foreground'], background: theme.colors['editor.background'] } }, ...theme.tokenColors] },
      onigLib: Promise.resolve({ createOnigScanner: s => new onig.OnigScanner(s), createOnigString: s => new onig.OnigString(s) }),
      loadGrammar: loadInstalledGrammar,
      getInjections: scope => [...grammarMetadata.values()].filter(entry => entry.injectTo?.includes(scope)).map(entry => entry.scopeName),
    });
    const grammar = rootScope ? await registry.loadGrammar(rootScope) : null;
    let stack = tm.INITIAL;
    const syntactic = grammar ? lines.map(line => {
      const result = grammar.tokenizeLine2(line, stack); stack = result.ruleStack;
      assert.equal(result.stoppedEarly, false);
      return result.tokens;
    }) : null;
    if (config.textmateOnly) {
      assert.ok(grammar, `${language}: missing official grammar`);
      const metadata = grammarMetadata.get(rootScope);
      assert.equal(metadata.extension.toLowerCase(), config.provider);
      let spans = 0;
      for (const tokens of syntactic) {
        for (let index = 1; index < tokens.length; index += 2) {
          assert.match(registry.getColorMap()[(tokens[index] >>> 15) & 511], /^#[\da-f]{6,8}$/i);
          spans++;
        }
      }
      assert.ok(spans > lines.length, `${language}: grammar must classify more than plain lines`);
      report.textmateResults.push({ language, variant: id, extension: metadata.extension, version: metadata.version, spans });
    }
    const signatures = new Map();
    for (const token of capture.tokens) {
      const column = token.column - 1, line = token.line - 1;
      assert.equal(lines[line].slice(column, column + token.length), token.text, `${language}: token/source mismatch`);
      const { style, provenance } = model({ ...token, languageId: config.languageId });
      const spans = syntactic?.[line] ?? [];
      let metadata;
      for (let i = 0; i < spans.length; i += 2) if (spans[i] <= column) metadata = spans[i + 1];
      if (grammar) assert.notEqual(metadata, undefined);
      const font = (metadata >>> 11) & 15;
      const final = { foreground: grammar ? registry.getColorMap()[(metadata >>> 15) & 511] : theme.colors['editor.foreground'], italic: Boolean(font & 1),
        bold: Boolean(font & 2), underline: Boolean(font & 4), strikethrough: Boolean(font & 8), ...style };
      assert.match(final.foreground, /^#[\da-f]{6,8}$/i);
      report.checks++;
      if (language === 'julia-jetls' && token.type === 'jetls.unspecified') {
        assert.ok(grammar, 'JETLS unspecified tokens require the syntactic grammar');
        assert.deepEqual(style, {}, `${language}/${id}: unspecified must preserve TextMate styling`);
        report.syntacticFallbackChecks++;
      }
      const signature = token.type + '.' + token.modifiers.join('.');
      if (!signatures.has(signature)) signatures.set(signature, { language, variant: id, signature, semantic: style, provenance, finalAtExampleStart: final, example: token.text });
      // A concrete provider-specific regression probe: Python's escape characters
      // should retain the core escape role rather than generic string green.
      if (language === 'python' && token.type === 'string' && token.modifiers.includes('escapeCharacter')) {
        const expected = getTheme(id).syntax.escape.foreground;
        if (final.foreground.toLowerCase() !== expected.toLowerCase()) report.findings.push({ language, variant: id, token, expected, actual: final.foreground,
          reason: 'Generic semantic string rule overrides Pylance escapeCharacter scope fallback', provenance });
      }
    }
    row.validatedVariants.push(id);
    report.combinations.push(...signatures.values());
    registry.dispose();
  }
}
} catch (error) { report.findings.push({ reason: error.message, stack: error.stack }); }
report.missingGrammarScopes = [...missing].sort();
const required = options.languages ? selected : [...new Set([...Object.keys(probes), ...Object.keys(matrix).filter(key => matrix[key].requiredSemantic || matrix[key].textmateOnly)])];
report.incompleteProbeLanguages = required.filter(language => report.matrix.find(row => row.language === language)?.validatedVariants.length !== variantIds.length);
await writeFile(`${directory}/validation.json`, JSON.stringify(report, null, 2));
const table = ['# Semantic provider matrix', '', 'Real provider capture; offline theme-resolution model. No visual acceptance implied.', '',
  '| Language | Provider | Version | Capture status | Tokens | Error diagnostics |', '| --- | --- | --- | --- | --- | --- |',
  ...report.matrix.map(row => `| ${row.language} | ${row.provider ?? (row.candidate ? `[${row.candidate.name}](${row.candidate.url}) (candidate)` : 'Not selected')} | ${row.version ?? '—'} | ${row.status} | ${row.tokenCount} | ${row.errorDiagnosticCount} |`), '',
  `Resolved ${report.checks} token/variant cases. Findings: ${report.findings.length}.`, '',
  `Official TextMate baselines: ${report.textmateResults.length} language/variant cases. JETLS syntactic fallback checks: ${report.syntacticFallbackChecks}.`, '',
  'No tokens observed is not proof that a provider never supports semantic tokens. Missing optional TextMate dependencies and diagnostics are retained in JSON reports.'];
await writeFile(`${directory}/matrix.md`, table.join('\n') + '\n');
console.log(`Validated ${report.checks} token/variant cases; ${report.findings.length} color findings; ${report.incompleteProbeLanguages.length} required captures missing. See ${directory}/matrix.md and validation.json.`);
if (!report.checks || report.findings.length || report.incompleteProbeLanguages.length) process.exitCode = 1;
