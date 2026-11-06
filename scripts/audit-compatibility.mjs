import { readFile } from 'node:fs/promises';

// Read-only audit. The pinned reference includes core colors and bundled Git
// colors, which are not registered in the isolated web workbench.
const root = new URL('../', import.meta.url);
const readJson = async path => JSON.parse(await readFile(new URL(path, root), 'utf8'));
const reference = await readJson('scripts/references/vscode-colors-1.142.0.json');
const manifest = await readJson('package.json');
const known = new Set([...reference.colors, ...Object.values(reference.extensionColors).flat()]);
const hex = /^#(?:[\da-f]{3}|[\da-f]{4}|[\da-f]{6}|[\da-f]{8})$/i;
const findings = [];
const themes = [];
const add = (theme, kind, property, details) => findings.push({ theme, kind, property, ...details });

for (const entry of manifest.contributes.themes) {
  const theme = await readJson(entry.path);
  const expectedType = { vs: 'light', 'vs-dark': 'dark', 'hc-black': 'hc', 'hc-light': 'hcLight' }[entry.uiTheme];
  themes.push({ label: entry.label, path: entry.path, uiTheme: entry.uiTheme, declaredType: theme.type, colors: Object.keys(theme.colors).length });
  if (theme.type !== expectedType) {
    add(entry.label, 'type-mismatch', 'type', { value: theme.type, expected: expectedType });
  }
  for (const [id, value] of Object.entries(theme.colors)) {
    if (!known.has(id)) add(entry.label, 'unregistered-color', id, { value });
    const constraint = reference.constraints[id];
    if (constraint?.deprecationMessage) {
      add(entry.label, 'deprecated-color', id, { message: constraint.deprecationMessage });
    }
    if (value === 'default') continue;
    if (!hex.test(value)) {
      add(entry.label, 'invalid-color', id, { value });
    } else if (constraint?.pattern && !new RegExp(constraint.pattern).test(value)) {
      add(entry.label, 'transparency-required', id, { value });
    }
  }
}

const counts = Object.fromEntries([...new Set(findings.map(f => f.kind))].sort()
  .map(kind => [kind, findings.filter(f => f.kind === kind).length]));
console.log(JSON.stringify({
  reference: { version: reference.version, commit: reference.commit, coreColors: reference.colors.length, extensionColors: Object.values(reference.extensionColors).flat().length },
  manifest: { name: manifest.name, publisher: manifest.publisher, engine: manifest.engines.vscode, repository: manifest.repository.url },
  themes, counts, findings
}, null, 2));

// Existing findings are reported without changing generated themes or baselines.
// Strict mode is suitable for a future gate once inherited defects are resolved.
if (process.argv.includes('--strict') && findings.length) process.exitCode = 1;
