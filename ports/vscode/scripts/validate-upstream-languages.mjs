import assert from 'node:assert/strict';
import { readFile, writeFile } from 'node:fs/promises';
import { createHash } from 'node:crypto';
import { createRequire } from 'node:module';
import { basename } from 'node:path';
import tm from 'vscode-textmate';
import onig from 'vscode-oniguruma';
import YAML from 'yaml';
import { catalog, samplePath } from '../../../tests/sample-catalog.mjs';

const require = createRequire(import.meta.url);
const directory = 'test-results/upstream-languages';
const hash = bytes => createHash('sha256').update(bytes).digest('hex');
const lockText = await readFile('ports/vscode/tests/upstream-grammars.json', 'utf8');
const lock = JSON.parse(lockText);
const inputs = JSON.parse(await readFile(`${directory}/inputs.json`, 'utf8'));
assert.equal(inputs.lockSha256, hash(lockText), 'Run prepare:languages:upstream after updating grammar pins');
for (const [file, source] of Object.entries(inputs.files)) {
  assert.equal(hash(await readFile(`${directory}/${file}`)), source.sha256, file);
}
const matrix = JSON.parse(await readFile('ports/vscode/tests/upstream-languages.json', 'utf8'));
assert.equal(Object.keys(matrix).length, 61, 'Cover the complete original language/dialect matrix');
const upstreamReadme = await readFile(`${directory}/README.md`, 'utf8');
const supportList = upstreamReadme.split('## Supported Languages')[1].split('## Syntax colors')[0];
const labels = supportList.split(/\r?\n/).filter(line => /^\s*-\s/.test(line))
  .map(line => line.replace(/^\s*-\s+/, '').split(' (requires')[0].trim())
  .filter(label => !['Markup', '_Other_'].includes(label));
const specialLabels = {
  'C/C++': ['c', 'cpp'], 'C#': ['csharp'], 'F#': ['fsharp'], 'Sass/SCSS': ['sass', 'scss'],
  'Cucumber (Gerkin)': ['gherkin'], 'Pug/Jade': ['pug'], 'React/JSX': ['jsx'],
  'Typescript/TSX': ['typescript', 'tsx'], 'Laravel Blade': ['blade'], 'ReasonML': ['reason'],
  'Shell Script': ['shell'], 'Apache Conf': ['apache'],
};
const declaredLanguages = labels.flatMap(label => specialLabels[label] ?? [label.toLowerCase().replace(/[^a-z]/g, '')]);
assert.deepEqual([...declaredLanguages].sort(), Object.keys(matrix).sort(), 'Matrix must cover every original README entry');
const baseline = JSON.parse(await readFile('ports/vscode/tests/baseline.json', 'utf8'));
const wasm = await readFile(require.resolve('vscode-oniguruma/release/onig.wasm'));
await onig.loadWASM(wasm.buffer.slice(wasm.byteOffset, wasm.byteOffset + wasm.byteLength));
const grammars = new Map();
const roots = new Map();
// Providers reference optional fenced/embedded languages beyond the main matrix.
for (const name of ['asm', 'ini', 'make', 'perl', 'xsl', 'bat', 'diff', 'dockerfile',
  'git-commit', 'git-rebase', 'jsonc', 'jsonl', 'less', 'raku', 'log', 'bibtex',
  'abap', 'rst', 'stylus', 'gnuplot', 'csv']) {
  for (const grammar of (await import(`@shikijs/langs/${name}`)).default) grammars.set(grammar.scopeName, grammar);
}
for (const [language, entry] of Object.entries(matrix)) {
  assert.ok(Object.hasOwn(catalog, language), `Missing sample: ${language}`);
  if (entry.grammar !== 'external') {
    const bundle = (await import(`@shikijs/langs/${entry.grammar}`)).default;
    for (const grammar of bundle) grammars.set(grammar.scopeName, grammar);
    roots.set(language, bundle.at(-1).scopeName);
  } else {
    const source = lock.external[language];
    for (const [index, path] of source.files.entries()) {
      const text = await readFile(`${directory}/${language}-${basename(path)}`, 'utf8');
      const grammar = path.endsWith('.yaml-tmLanguage') ? YAML.parse(text) : tm.parseRawGrammar(text, path);
      grammars.set(grammar.scopeName, grammar);
      if (index === 0) roots.set(language, grammar.scopeName);
    }
  }
}
const missingScopes = new Set();
// The EJS extension associates .ejs with HTML and injects its grammar there.
roots.set('ejs', 'text.html.basic');
const registry = new tm.Registry({
  getInjections: scope => scope === 'text.html.basic' ? ['text.html.ejs'] : [],
  onigLib: Promise.resolve({ createOnigScanner: s => new onig.OnigScanner(s), createOnigString: s => new onig.OnigString(s) }),
  loadGrammar: async scope => {
    if (!grammars.has(scope)) missingScopes.add(scope);
    return grammars.get(scope) ?? null;
  },
});
const themeSettings = theme => ({ settings: [{ settings: {
  foreground: theme.colors['editor.foreground'], background: theme.colors['editor.background'],
}}, ...theme.tokenColors] });
function tokenize(grammar, lines) {
  let stack = tm.INITIAL;
  return lines.map(line => {
    const result = grammar.tokenizeLine2(line, stack);
    assert.equal(result.stoppedEarly, false, 'Grammar tokenization timed out');
    const scoped = grammar.tokenizeLine(line, stack);
    stack = result.ruleStack;
    const colors = registry.getColorMap();
    const cells = [];
    for (let i = 0; i < result.tokens.length; i += 2) {
      const start = result.tokens[i], end = result.tokens[i + 2] ?? line.length;
      const metadata = result.tokens[i + 1];
      const style = { fg: colors[(metadata >>> 15) & 511], bg: colors[metadata >>> 24], font: (metadata >>> 11) & 15 };
      for (let col = start; col < end; col++) cells[col] = style;
    }
    return { cells, scopes: scoped.tokens };
  });
}
const report = { upstream: lock.upstream, declaredLabels: labels, grammarPackage: `@shikijs/langs@${lock.shikiVersion}`,
  semanticTokensTested: false, inputs, grammars: {}, results: [], unexpectedDifferences: [], missingScopes: [] };
for (const [scope, grammar] of grammars) report.grammars[scope] = hash(JSON.stringify(grammar));
for (const entry of baseline.themes) {
  const file = basename(entry.path);
  const original = JSON.parse(await readFile(`${directory}/${file}`, 'utf8'));
  const current = JSON.parse(await readFile(`ports/vscode/themes/${file}`, 'utf8'));
  assert.deepEqual(current.tokenColors.slice(0, original.tokenColors.length), original.tokenColors, `${file}: original rules changed`);
  for (const language of Object.keys(matrix)) {
    const text = await readFile(samplePath(language), 'utf8');
    const lines = text.split(/\r?\n/);
    registry.setTheme(themeSettings(original));
    const grammar = await registry.loadGrammar(roots.get(language));
    assert.ok(grammar, language);
    const before = tokenize(grammar, lines);
    registry.setTheme(themeSettings(current));
    const after = tokenize(grammar, lines);
    const colors = new Set();
    let characters = 0, intentionalChanges = 0, scopedCharacters = 0;
    for (const [row, line] of lines.entries()) {
      for (let col = 0; col < line.length; col++) {
        if (/\s/.test(line[col])) continue;
        characters++;
        const left = before[row].cells[col], right = after[row].cells[col];
        assert.ok(left && right, `${language}:${row + 1}:${col + 1}`);
        colors.add(right.fg);
        const scopes = after[row].scopes.find(t => t.startIndex <= col && t.endIndex > col)?.scopes ?? [];
        if (scopes.length > 1) scopedCharacters++;
        if (JSON.stringify(left) === JSON.stringify(right)) continue;
        const juliaInterpolation = language === 'julia' && scopes.includes('variable.interpolation.julia')
          && right.fg.toLowerCase() === current.tokenColors.find(r => r.name === 'Julia interpolation').settings.foreground.toLowerCase()
          && left.bg === right.bg && left.font === right.font;
        const markdownEmphasis = language === 'markdown' && scopes.includes('markup.bold.markdown')
          && scopes.includes('markup.italic.markdown') && right.font === 3 && left.fg === right.fg && left.bg === right.bg;
        if (juliaInterpolation || markdownEmphasis) intentionalChanges++;
        else if (report.unexpectedDifferences.length < 100) report.unexpectedDifferences.push({ variant: file, language, row: row + 1, col: col + 1, character: line[col], scopes, before: left, after: right });
      }
    }
    assert.ok(characters > 40 && scopedCharacters > 20 && colors.size >= 2, `${language}: insufficient real highlighting`);
    report.results.push({ language, variant: file, characters, scopedCharacters, distinctColors: colors.size,
      intentionalChanges, sampleSha256: hash(text.replace(/\r\n/g, '\n')), rootScope: roots.get(language) });
  }
}
report.missingScopes = [...missingScopes];
registry.dispose();
await writeFile('test-results/upstream-language-validation.json', JSON.stringify(report, null, 2));
assert.deepEqual(report.missingScopes.sort(), lock.optionalMissingScopes.sort(), 'Changed optional grammar gaps: investigate and document');
assert.equal(report.unexpectedDifferences.length, 0, 'Unexpected highlighting changes: see test-results/upstream-language-validation.json');
console.log(`Passed ${report.results.length} language/variant comparisons; ${report.results.reduce((n, r) => n + r.characters, 0)} non-whitespace character styles checked.`);
