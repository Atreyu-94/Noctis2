import { readFileSync, writeFileSync, mkdirSync, readdirSync, copyFileSync, existsSync } from 'node:fs';
import { resolve, join } from 'node:path';
import assert from 'node:assert/strict';
import { createHash, randomUUID } from 'node:crypto';
import { pathToFileURL } from 'node:url';

const root = process.cwd();
const [editor, key] = process.argv.slice(2);
assert.ok(['neovim', 'zed'].includes(editor), 'Expected neovim or zed');
assert.ok(Object.hasOwn(JSON.parse(readFileSync('tests/native-semantic-probes.json', 'utf8')), key), 'Unknown native semantic case');
const catalog = JSON.parse(readFileSync('tests/samples/catalog.json', 'utf8'));
const output = resolve('test-results/native-semantic', editor, key);
const runId = randomUUID();
const workspace = join(output, 'workspaces', runId);
mkdirSync(workspace, { recursive: true });
const extension = (group, prefix) => {
  const base = resolve('test-results/semantic-ci', group, 'extensions');
  const found = readdirSync(base).filter(n => n.startsWith(prefix + '-'));
  assert.equal(found.length, 1, prefix);
  return join(base, found[0]);
};
const clangd = resolve('test-results/semantic-ci/native/runtimes/clangd/clangd_22.1.6/bin/clangd.exe');
const modules = resolve('test-results/native-semantic/runtimes/node/node_modules');
let config;
if (key === 'html') config = { command: [process.execPath, join(modules, 'vscode-langservers-extracted/bin/vscode-html-language-server'), '--stdio'],
  filetype: 'html', zedLanguage: 'HTML', zedServer: 'vscode-html-language-server', zedExtension: 'html', timeoutMs: 30000 };
if (key === 'gherkin') config = { command: [process.execPath, join(modules, '@cucumber/language-server/bin/cucumber-language-server.js'), '--stdio'],
  filetype: 'gherkin', zedLanguage: 'Gherkin', zedServer: 'cucumber', zedExtension: 'cucumber' };
if (key === 'twig') config = { command: [process.execPath, join(extension('web', 'moetelo.twiggy'), 'dist/server.js'), '--stdio'],
  filetype: 'twig', zedLanguage: 'Twig', zedServer: 'twiggy-language-server', zedExtension: 'twig' };
if (key === 'powershell') {
  const modules = join(extension('bundled', 'ms-vscode.powershell'), 'modules');
  config = { command: [join(process.env.ProgramFiles, 'PowerShell/7/pwsh.exe'), '-NoLogo', '-NoProfile', '-NonInteractive', '-File',
    join(modules, 'PowerShellEditorServices/Start-EditorServices.ps1'), '-Stdio', '-LanguageServiceOnly', '-HostName', 'Noctis2Tests', '-HostProfileId', 'Noctis2Tests',
    '-HostVersion', '1.0.0', '-BundledModulesPath', modules, '-LogLevel', 'Warning', '-LogPath', join(output, 'powershell.log'), '-SessionDetailsPath', join(output, 'powershell-session.json')],
    filetype: 'ps1', zedLanguage: 'PowerShell', zedServer: 'powershell-es', zedExtension: 'powershell' };
}
if (['csharp', 'fsharp', 'visualbasic'].includes(key)) {
  const runtime = resolve('test-results/semantic-ci/dotnet/runtimes');
  const dotnet = join(runtime, 'dotnet');
  const env = { DOTNET_ROOT: dotnet, DOTNET_CLI_HOME: join(output, 'dotnet-home'), NUGET_PACKAGES: join(runtime, 'nuget'),
    DOTNET_SKIP_FIRST_TIME_EXPERIENCE: '1', DOTNET_CLI_TELEMETRY_OPTOUT: '1', PATH: dotnet + ';' + process.env.PATH };
  if (key === 'csharp') config = { command: [join(extension('dotnet', 'ms-dotnettools.csharp'), '.roslyn/Microsoft.CodeAnalysis.LanguageServer.exe'), '--stdio', '--autoLoadProjects', '--logLevel', 'Warning', '--extensionLogDirectory', join(output, 'roslyn-logs')],
    filetype: 'cs', zedLanguage: 'CSharp', zedServer: 'roslyn', zedExtension: 'csharp', env };
  if (key === 'fsharp') config = { command: [join(dotnet, 'dotnet.exe'), join(extension('dotnet', 'ionide.ionide-fsharp'), 'bin/net10.0/fsautocomplete.dll')],
    filetype: 'fsharp', zedLanguage: 'FSharp', zedServer: 'fsautocomplete', zedExtension: 'fsharp', env,
    initOptions: { AutomaticWorkspaceInit: true }, settings: { FSharp: { automaticWorkspaceInit: true } } };
  if (key === 'visualbasic') config = { command: [join(dotnet, 'dotnet.exe'), join(extension('dotnet', 'dnakode.vbnet-language-support'), '.server/VbNet.LanguageServer.dll'), '--stdio'],
    filetype: 'vb', env, zedUnsupportedReason: 'No Visual Basic language adapter in the official Zed extension registry inspected for this run',
    settings: { vbnet: { workspace: { projectPaths: [join(workspace, 'Observatory.vbproj')] } } } };
  const ext = { csharp: 'cs', fsharp: 'fs', visualbasic: 'vb' }[key];
  writeFileSync(join(workspace, 'Observatory.' + ext + 'proj'), `<Project Sdk="Microsoft.NET.Sdk"><PropertyGroup><OutputType>Exe</OutputType><TargetFramework>net10.0</TargetFramework><EnableDefaultCompileItems>false</EnableDefaultCompileItems></PropertyGroup><ItemGroup><Compile Include="${catalog[key].file}" /></ItemGroup></Project>`);
}
if (key === 'java') {
  const extensionPath = extension('jvm', 'redhat.java');
  const server = join(extensionPath, 'server');
  const launcher = readdirSync(join(server, 'plugins')).find(n => n.startsWith('org.eclipse.equinox.launcher_') && n.endsWith('.jar'));
  config = { command: [join(extensionPath, 'jre/25.0.4.1-win32-x86_64/bin/java.exe'), '-Declipse.application=org.eclipse.jdt.ls.core.id1',
    '-Dosgi.bundles.defaultStartLevel=4', '-Declipse.product=org.eclipse.jdt.ls.core.product', '-Xmx1G', '--add-modules=ALL-SYSTEM',
    '--add-opens', 'java.base/java.util=ALL-UNNAMED', '--add-opens', 'java.base/java.lang=ALL-UNNAMED', '-jar', join(server, 'plugins', launcher),
    '-configuration', join(server, 'config_win'), '-data', join(output, 'jdtls-data')],
    filetype: 'java', zedLanguage: 'Java', zedServer: 'jdtls', zedExtension: 'java', timeoutMs: 300000,
    settings: { java: { semanticHighlighting: { enabled: true } } }, initOptions: { settings: { java: { semanticHighlighting: { enabled: true } } } } };
}
if (key === 'scala') config = { command: [resolve('test-results/semantic-ci/jvm/runtimes/jdk21/jdk-21.0.13+9/bin/java.exe'), '-cp',
  readFileSync('test-results/native-semantic/runtimes/metals-classpath.txt', 'utf8').replace(/^\uFEFF/, '').trim().split(';').map(path => resolve(path)).join(';'), 'scala.meta.metals.Main'],
  filetype: 'scala', zedLanguage: 'Scala', zedServer: 'metals', zedExtension: 'scala',
  env: { COURSIER_CACHE: resolve('test-results/native-semantic/runtimes/coursier') },
  initOptions: { semanticHighlighting: true }, settings: { metals: { enableSemanticHighlighting: true } }, timeoutMs: 300000 };
if (key === 'scala') {
  mkdirSync(join(workspace, 'project'), { recursive: true });
  writeFileSync(join(workspace, 'build.sbt'), 'scalaVersion := "2.13.18"\nCompile / unmanagedSourceDirectories := Seq(baseDirectory.value)\n');
  writeFileSync(join(workspace, 'project/build.properties'), 'sbt.version=1.12.0\n');
}
if (['javascript', 'jsx', 'typescript', 'tsx'].includes(key)) {
  config = { command: [process.execPath, join(modules, '@vtsls/language-server/bin/vtsls.js'), '--stdio'],
    filetype: { javascript: 'javascript', jsx: 'javascriptreact', typescript: 'typescript', tsx: 'typescriptreact' }[key],
    zedLanguage: { javascript: 'JavaScript', jsx: 'TSX', typescript: 'TypeScript', tsx: 'TSX' }[key], zedServer: 'vtsls' };
  writeFileSync(join(workspace, 'tsconfig.json'), JSON.stringify({ compilerOptions: { allowJs: true, checkJs: true, jsx: 'preserve', target: 'ES2022' }, include: ['*'] }));
}
if (key === 'python') config = { command: [process.execPath, join(modules, 'basedpyright/langserver.index.js'), '--stdio'],
  filetype: 'python', zedLanguage: 'Python', zedServer: 'basedpyright' };
if (key === 'toml') config = { command: [resolve('test-results/native-semantic/runtimes/taplo/taplo.exe'), 'lsp', 'stdio'],
  filetype: 'toml', zedLanguage: 'TOML', zedServer: 'taplo', zedExtension: 'toml' };
if (key === 'terraform') config = { command: [join(extension('bundled', 'hashicorp.terraform'), 'bin/terraform-ls.exe'), 'serve'],
  filetype: 'terraform', zedLanguage: 'Terraform', zedServer: 'terraform-ls', zedExtension: 'terraform' };
if (key === 'ruby') {
  const runtime = resolve('test-results/semantic-ci/ruby/runtimes');
  const ruby = join(runtime, 'ruby/rubyinstaller-4.0.9-1-x64/bin/ruby.exe');
  config = { command: [ruby, '-x', join(runtime, 'gems/bin/ruby-lsp')],
    env: { GEM_HOME: join(runtime, 'gems'), GEM_PATH: join(runtime, 'gems') + ';' + join(runtime, 'ruby/rubyinstaller-4.0.9-1-x64/lib/ruby/gems/4.0.0'), BUNDLE_GEMFILE: join(runtime, 'Gemfile'), PATH: join(runtime, 'ruby/rubyinstaller-4.0.9-1-x64/bin') + ';' + process.env.PATH },
    filetype: 'ruby', zedLanguage: 'Ruby', zedServer: 'ruby-lsp', zedExtension: 'ruby' };
}
if (key === 'kotlin') {
  const server = resolve('test-results/semantic-ci/jvm/profile-kotlin/User/globalStorage/fwcd.kotlin/langServerInstall/server');
  config = { command: [resolve('test-results/semantic-ci/jvm/runtimes/jdk21/jdk-21.0.13+9/bin/java.exe'), '-cp', join(server, 'lib/*'), 'org.javacs.kt.MainKt'],
    filetype: 'kotlin', zedLanguage: 'Kotlin', zedServer: 'kotlin-language-server', zedExtension: 'kotlin', timeoutMs: 300000 };
  const jars = readdirSync(join(server, 'lib')).filter(n => n.startsWith('kotlin-stdlib') && n.endsWith('.jar')).map(n => join(server, 'lib', n));
  writeFileSync(join(workspace, 'kls-classpath.cmd'), '@echo off\r\necho ' + jars.join(';') + '\r\n');
}
if (['c', 'cpp', 'objectivec'].includes(key)) config = {
  command: [clangd, '--background-index=false'], filetype: { c: 'c', cpp: 'cpp', objectivec: 'objc' }[key],
  zedLanguage: { c: 'C', cpp: 'C++', objectivec: 'Objective-C' }[key], zedServer: 'clangd',
  ...(key === 'objectivec' ? { zedExtension: 'objective-c', zedServer: 'objc-clangd' } : {}),
};
if (key === 'typst') config = { command: [join(extension('bundled', 'myriad-dreamin.tinymist'), 'out/tinymist.exe'), 'lsp'],
  filetype: 'typst', zedLanguage: 'Typst', zedServer: 'tinymist', zedExtension: 'typst', initOptions: { semanticTokens: 'enable', exportPdf: 'never' } };
if (key === 'lua') config = { command: [join(extension('bundled', 'sumneko.lua'), 'server/bin/lua-language-server.exe')],
  filetype: 'lua', zedLanguage: 'Lua', zedServer: 'lua-language-server', zedExtension: 'lua' };
if (key === 'julia-fatou') config = { command: [join(extension('julia', 'jolars.fatou'), 'server/fatou.exe'), 'lsp'],
  sample: 'julia', filetype: 'julia', zedLanguage: 'Julia', zedServer: 'jetls', zedExtension: 'julia' };
if (key === 'julia-jetls') {
  const launch = JSON.parse(readFileSync('test-results/semantic-ci/julia/launch.json', 'utf8'));
  config = { command: [launch.julia, '--startup-file=no', '--history-file=no', '--threads=2', `--project=${launch.jetlsDepot}/environments/apps/JETLS`, '-m', 'JETLS', 'serve'],
    env: { JULIA_DEPOT_PATH: launch.jetlsDepot }, sample: 'julia', filetype: 'julia', zedLanguage: 'Julia', zedServer: 'jetls', zedExtension: 'julia', timeoutMs: 600000 };
}
if (key === 'rust') {
  const runtime = resolve('test-results/semantic-ci/rust/runtimes');
  config = { command: [join(extension('rust', 'rust-lang.rust-analyzer'), 'server/rust-analyzer.exe')],
    filetype: 'rust', zedLanguage: 'Rust', zedServer: 'rust-analyzer',
    env: { RUSTUP_HOME: join(runtime, 'rustup'), CARGO_HOME: join(runtime, 'cargo'), RUSTUP_TOOLCHAIN: '1.99.1' },
    settings: { 'rust-analyzer': { checkOnSave: false, cargo: { buildScripts: { enable: false } }, procMacro: { enable: false } } }, file: 'src/main.rs' };
  mkdirSync(join(workspace, 'src'), { recursive: true });
  writeFileSync(join(workspace, 'Cargo.toml'), '[package]\nname="noctis2-semantic-sample"\nversion="0.0.0"\nedition="2021"\n');
}
if (key === 'go') {
  const runtime = resolve('test-results/semantic-ci/go/runtimes');
  config = { command: [join(runtime, 'gopath/bin/gopls.exe')], filetype: 'go', zedLanguage: 'Go', zedServer: 'gopls',
    env: { GOROOT: join(runtime, 'go'), GOPATH: join(runtime, 'gopath'), GOCACHE: join(runtime, 'gocache'), PATH: join(runtime, 'go/bin') + ';' + process.env.PATH },
    settings: { gopls: { semanticTokens: true } }, initOptions: { semanticTokens: true } };
  writeFileSync(join(workspace, 'go.mod'), 'module example.com/noctis2sample\n\ngo 1.23.0\n');
}
if (key === 'dart') {
  config = { command: [resolve('test-results/semantic-ci/dart/runtimes/dart-sdk/bin/dart.exe'), 'language-server', '--protocol=lsp'],
    filetype: 'dart', zedLanguage: 'Dart', zedServer: 'dart', zedExtension: 'dart' };
  writeFileSync(join(workspace, 'pubspec.yaml'), "name: noctis2_sample\nenvironment:\n  sdk: '>=3.0.0 <4.0.0'\n");
}
assert.ok(config, `Native case not configured: ${key}`);
assert.ok(existsSync(config.command[0]), config.command[0]);
config = { ...config, case: key, editor, root, output, workspace, trace: join(output, 'lsp.jsonl'), timeoutMs: config.timeoutMs ?? 180000 };
if (editor === 'zed' && key === 'julia-jetls') config.timeoutMs = 180000;
config.file = join(workspace, config.file ?? catalog[config.sample ?? key].file);
config.fileUri = pathToFileURL(config.file).href;
copyFileSync(join(root, 'tests/samples/languages', catalog[config.sample ?? key].file), config.file);
config.runId = runId;
if (editor === 'zed') config.profile = join(output, 'profiles', config.runId);
config.sampleSha256 = createHash('sha256').update(readFileSync(config.file, 'utf8').replaceAll('\r\n', '\n')).digest('hex');
writeFileSync(config.trace, '');
writeFileSync(config.trace + '.stderr', '');
const configPath = join(output, 'launch.json');
if (editor === 'zed' && ['julia-jetls', 'powershell'].includes(key)) {
  config.warmupFile = join(workspace, 'warmup-' + catalog[config.sample ?? key].file);
  writeFileSync(config.warmupFile, '\n');
}
writeFileSync(configPath, JSON.stringify(config, null, 2));
if (editor === 'zed' && !config.zedUnsupportedReason) {
  const profile = config.profile;
  mkdirSync(join(profile, 'config/themes'), { recursive: true });
  copyFileSync('ports/zed/themes/noctis2.json', join(profile, 'config/themes/noctis2.json'));
  const settings = { ...JSON.parse(readFileSync('ports/zed/semantic-settings.json', 'utf8')),
    theme: 'Noctis2', auto_update: false, onboarding: false, disable_ai: true,
    telemetry: { diagnostics: false, metrics: false }, session: { trust_all_worktrees: true },
    auto_install_extensions: { html: false, ...(config.zedExtension ? { [config.zedExtension]: true } : {}) },
    languages: { [config.zedLanguage]: { language_servers: [config.zedServer] } },
    lsp: { [config.zedServer]: { binary: { path: process.execPath, arguments: [join(root, 'tooling/semantic-lsp-proxy.mjs'), configPath] },
      initialization_options: config.initOptions, settings: config.settings?.[config.zedServer] ?? config.settings } } };
  writeFileSync(join(profile, 'config/settings.json'), JSON.stringify(settings, null, 2));
}
console.log(configPath);
