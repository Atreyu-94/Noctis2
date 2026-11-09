import { readFileSync, writeFileSync, existsSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { join } from 'node:path';
import { spawnSync } from 'node:child_process';
import assert from 'node:assert/strict';
import { parse } from 'jsonc-parser';
import { getTheme, variantIds } from '../dist/core/src/index.js';
import { realSession, zedStyle } from './native-semantic-model.mjs';

const json = path => JSON.parse(readFileSync(path, 'utf8').replace(/^\uFEFF/, ''));
const hash = text => createHash('sha256').update(text).digest('hex');
const probes = json('tests/native-semantic-probes.json');
const editors = process.argv[2] ? [process.argv[2]] : ['neovim', 'zed'];
assert.ok(editors.every(e => ['neovim', 'zed'].includes(e)));
const keys = process.argv[3]?.split(',') ?? Object.keys(probes);
const report = { generatedAt: new Date().toISOString(), variants: variantIds, cases: [], findings: [] };
const source = 'test-results/native-languages/sources/zed-industries--zed-' + json('tests/native-languages.lock.json').providers.zed.rev;
const defaultsText = readFileSync(join(source, 'assets/settings/default_semantic_token_rules.json'), 'utf8');
const errors = [];
const defaults = parse(defaultsText, errors, { allowTrailingComma: true });
assert.equal(errors.length, 0);
const family = json('ports/zed/themes/noctis2.json');
assert.equal(variantIds.length, 11);
function normalizedNvim(groups) {
  const style = {};
  for (const group of [...groups].sort((a, b) => a.priority - b.priority)) Object.assign(style, group.style);
  return { ...(style.fg == null ? {} : { foreground: '#' + style.fg.toString(16).padStart(6, '0') }),
    ...Object.fromEntries(['bold', 'italic', 'underline', 'strikethrough'].filter(k => style[k] != null).map(k => [k, style[k]])) };
}
function normalizedZed(style) {
  return { ...(style.color ? { foreground: style.color.toLowerCase().replace(/ff$/, m => style.color.length === 9 ? '' : m) } : {}),
    ...(style.font_weight == null ? {} : { bold: style.font_weight >= 700 }),
    ...(style.font_style == null ? {} : { italic: style.font_style === 'italic' }) };
}
for (const editor of editors) for (const key of keys) {
  const path = join('test-results/native-semantic', editor, key);
  const item = { editor, case: key, status: 'not-captured', tokenVariantChecks: 0, probeChecks: 0, fallbackTokens: {}, findings: [] };
  report.cases.push(item);
  try {
    const config = json(join(path, 'launch.json'));
    if (editor === 'zed' && config.zedUnsupportedReason) throw new Error(config.zedUnsupportedReason);
    const entries = readFileSync(config.trace, 'utf8').trim().split('\n').map(JSON.parse);
    const session = realSession(entries, config.runId, editor, config.fileUri);
    assert.equal(hash(session.open.text.replaceAll('\r\n', '\n')), config.sampleSha256, 'didOpen source hash');
    assert.equal(hash(readFileSync(config.file, 'utf8').replaceAll('\r\n', '\n')), config.sampleSha256, 'Current sample hash');
    Object.assign(item, { runId: config.runId, client: session.client, server: session.server,
      command: session.start.command, tokens: session.tokens.length, legend: session.capability.legend,
      sampleSha256: config.sampleSha256, traceSha256: hash(readFileSync(config.trace)) });
    let capture, rules;
    if (editor === 'neovim') {
      capture = json(join(path, 'capture.json'));
      assert.equal(capture.status, 'captured');
      assert.equal(capture.runId, config.runId);
      item.protocolTokens = session.tokens.length;
      assert.ok(capture.tokens.length >= session.tokens.length, 'Native capture does not cover the full document response');
      assert.deepEqual(Object.keys(capture.variants).sort(), [...variantIds].sort());
      item.evidence = 'Native Neovim LSP tokens and resolved highlight groups, all eleven loaded colorschemes';
      item.syntacticBase = capture.syntacticBase;
      // Native decoding uses byte positions; retain its complete final token list.
      session.tokens = capture.tokens.map(t => ({ ...t, modifiers: Object.keys(t.modifiers).filter(m => t.modifiers[m]) }));
      item.tokens = session.tokens.length;
    } else {
      const status = json(join(path, 'capture-status.json'));
      assert.equal(status.runId, config.runId);
      item.settingsRefreshed = status.settingsRefreshed ?? false;
      const profile = config.profile ?? join(path, 'profile');
      const settings = json(join(profile, 'config/settings.json'));
      assert.equal(settings.semantic_tokens, 'combined');
      assert.deepEqual(settings.global_lsp_settings?.semantic_token_rules,
        json('ports/zed/semantic-settings.json').global_lsp_settings.semantic_token_rules, 'Stale semantic settings');
      assert.deepEqual(json(join(profile, 'config/themes/noctis2.json')), family, 'Stale isolated theme');
      assert.ok(session.client.version.includes(json('tests/native-languages.lock.json').providers.zed.rev.slice(0, 7)), 'Zed model revision mismatch');
      // Read the installed extension config, not a guessed list of language rules.
      const python = spawnSync('python', ['-c',
        'import pathlib,tomllib,json,sys; p=pathlib.Path(sys.argv[1]); files=[f.parent/"semantic_token_rules.json" for f in p.glob("**/languages/*/config.toml") if tomllib.loads(f.read_text(encoding="utf-8")).get("name")==sys.argv[2]]; print(json.dumps([f.read_text(encoding="utf-8") for f in files if f.exists()]))',
        join(profile, 'extensions/installed'), config.zedLanguage], { encoding: 'utf8' });
      assert.equal(python.status, 0, python.stderr);
      const languageRules = JSON.parse(python.stdout).flatMap(text => {
        const errors = []; const rules = parse(text, errors, { allowTrailingComma: true });
        assert.equal(errors.length, 0, 'Malformed installed language rules'); return rules;
      });
      rules = [...settings.global_lsp_settings.semantic_token_rules, ...languageRules, ...defaults];
      item.rulesSha256 = hash(JSON.stringify(rules));
      item.defaultRulesSha256 = hash(defaultsText);
      item.evidence = 'Actual Zed LSP traffic; offline style resolution using matching Zed source, not pixel/render verification';
    }
    for (const variant of variantIds) {
      const core = getTheme(variant);
      const colors = new Set(Object.values(core.syntax).map(s => s.foreground?.toLowerCase()).filter(Boolean));
      const theme = family.themes.find(t => t.name === core.name);
      const semanticStyles = [];
      const styles = session.tokens.map((token, index) => {
        const style = editor === 'neovim' ? normalizedNvim(capture.variants[variant][index].groups)
          : normalizedZed(zedStyle(token, theme.style.syntax, rules));
        semanticStyles.push(style);
        if (!style.foreground) item.fallbackTokens[token.type] = (item.fallbackTokens[token.type] ?? 0) + 1;
        item.tokenVariantChecks++;
        const resolved = editor === 'neovim' ? normalizedNvim([...(capture.variants[variant][index].syntaxGroups ?? []), ...capture.variants[variant][index].groups]) : style;
        if (resolved.foreground && !colors.has(resolved.foreground)) item.findings.push({ variant,
          probe: { text: token.text, type: token.type, role: 'variant palette' }, actual: resolved.foreground,
          problem: 'Resolved foreground is outside this variant syntax palette' });
        return resolved;
      });
      assert.ok(probes[key], `No probes for ${key}`);
      for (const probe of probes[key]) {
        const indices = session.tokens.flatMap((t, index) => t.text === probe.text && t.type === probe.type
          && (probe.modifiers ?? []).every(m => t.modifiers.includes(m)) ? [index] : []);
        if (!indices.length) { item.findings.push({ variant, probe, problem: 'Expected real token not observed' }); continue; }
        item.probeChecks++;
        for (const index of indices) {
          const actual = styles[index];
          if (probe.preserveSyntax) {
            if (Object.keys(semanticStyles[index]).length) item.findings.push({ variant, probe, actual: semanticStyles[index], problem: 'Unspecified token overrides syntax' });
            if (editor === 'neovim' && !normalizedNvim(capture.variants[variant][index].syntaxGroups ?? []).foreground) {
              item.findings.push({ variant, probe, problem: 'No captured native Tree-sitter foreground under unspecified token' });
            }
            continue;
          }
          const expected = core.syntax[probe.role];
          for (const [field, value] of Object.entries(expected)) {
            if (editor === 'zed' && ['underline', 'strikethrough'].includes(field)) continue;
            const got = actual[field] ?? (typeof value === 'boolean' ? false : undefined);
            if (got !== value) item.findings.push({ variant, probe, field, expected: value, actual: got ?? null,
              ...(editor === 'zed' && got === undefined ? { problem: 'No semantic style; native syntax fallback not verified' } : {}) });
          }
        }
      }
    }
    item.status = item.findings.length ? 'style-findings' : 'passed';
  } catch (error) { item.status = 'blocked'; item.error = error.message; }
  report.findings.push(...item.findings.map(f => ({ editor, case: key, ...f })));
  console.log(`${editor}/${key}: ${item.status}; ${item.tokens ?? 0} tokens, ${item.tokenVariantChecks} token/variant checks, ${item.findings.length} findings${item.error ? '; ' + item.error : ''}`);
}
writeFileSync('test-results/native-semantic/validation.json', JSON.stringify(report, null, 2) + '\n');
const lines = ['# Native semantic validation', '', `Generated: ${report.generatedAt}`, '',
  'Neovim: actual native highlight inspection. Zed: actual native LSP traffic plus offline styles from the matching source revision; not rendered-pixel acceptance.', '',
  'All captured cases are checked against the eleven variants. Passed means the selected role probes passed. Unmapped semantic types can depend on syntax highlighting; a missing semantic style alone does not prove the rendered color is wrong.', '',
  '| Editor | Case | Status | Tokens | Token/variant checks | Probe checks | Findings |', '| --- | --- | --- | ---: | ---: | ---: | ---: |',
  ...report.cases.map(c => `| ${c.editor} | ${c.case} | ${c.status} | ${c.tokens ?? 0} | ${c.tokenVariantChecks} | ${c.probeChecks} | ${c.findings.length} |`),
  '', '## Blocked cases', '', ...report.cases.filter(c => c.error).map(c => `- **${c.editor}/${c.case}**: ${c.error.replace(/\s+/g, ' ').slice(0, 350)}`),
  '', '## Findings', '', ...report.cases.filter(c => c.findings.length).map(c => `- **${c.editor}/${c.case}**: ` +
    [...new Set(c.findings.map(f => `${f.probe.text} (${f.probe.type} → ${f.probe.role ?? 'syntax'}): ${f.problem ?? f.field}`))].join('; ')),
  '', 'Raw protocol, sample hashes, client/server identity, fallback counts and all per-variant details are retained in validation.json and the case directories.', ''];
writeFileSync('test-results/native-semantic/validation.md', lines.join('\n'));
if (report.cases.some(c => c.status !== 'passed')) process.exitCode = 1;
