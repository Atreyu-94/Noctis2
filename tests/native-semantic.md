# Native semantic provider validation

These tests attach real language servers to isolated **Neovim and Zed clients**.
They do not replay VS Code tokens into another editor. The stdio observer records
the native client's initialize/didOpen/full requests and the server's replies
without changing their contents. Samples come from `samples/languages/`.

## Evidence and limits

- Neovim loads all eleven real colorschemes and inspects native semantic highlight
  groups, their priorities, links and resolved styles at each received token.
  It waits for the full-document result, not the earlier viewport range response.
  The harness uses Neovim's explicitly test-only `__STHighlighter` export and is
  therefore pinned to 0.12.6; the validator also checks coverage against the full
  protocol response.
  Where captured, native Tree-sitter groups are composed below the semantic groups;
  a correct syntactic fallback can satisfy a role without an explicit LSP mapping.
  The JETLS unspecified-token probe also checks the underlying native Tree-sitter
  foreground, rather than assuming an empty semantic style is sufficient.
- Zed starts with an isolated `--user-data-dir`, the generated theme family and
  the generated `ports/zed/semantic-settings.json` fragment (including
  `semantic_tokens: "combined"` and `global_lsp_settings.semantic_token_rules`).
  The captured client identity must match Zed.
  All eleven variants are checked with an **offline style model** based on the
  exact Zed revision in `native-languages.lock.json`, including installed language
  rules and attribute-by-attribute precedence. This is not a renderer screenshot
  test and does not establish visual acceptance of the other ten themes.
- Every resolved foreground must belong to the corresponding variant's syntax
  palette; probes additionally assert selected core roles. Additional tokens without an explicit
  semantic foreground are counted by type as syntax fallbacks; they do not
  automatically count as correct colors. A passed case means its probes passed,
  not that every token was assigned a semantic color.
- No response, an empty response, a stale run ID, wrong client, mismatched sample,
  missing probe or color mismatch cannot count as a passed case. Failed cases
  remain visible and make the validator exit nonzero.
- Zed opens the actual sample after identifying and protecting its isolated window.
  JETLS and PowerShell first open an empty same-language initialization fixture;
  the actual sample opens through the normal CLI after capability registration.
  The observer never substitutes capabilities
  to make a server pass. If no sample request arrives after capability registration, the harness toggles
  the isolated semantic setting off and back once through Zed's normal settings
  reload, restoring the exact generated settings before validation.

## Native provider matrix

| Samples | Server used outside VS Code |
| --- | --- |
| C, C++, Objective-C | clangd 22.1.6 (not cpptools) |
| JavaScript, JSX, TypeScript, TSX | vtsls 0.3.0 |
| Python | basedpyright 1.40.2 (not Pylance) |
| Julia | JETLS and Fatou, separately |
| Typst | Tinymist 0.15.12 |
| Lua | Lua Language Server bundled with extension 3.19.2 |
| Rust | rust-analyzer bundled with extension 0.3.3105 |
| Go | isolated gopls runtime from the VS Code CI preparation |
| Dart | isolated Dart SDK language-server |
| TOML | standalone Taplo 0.10.0 |
| Terraform | terraform-ls bundled with extension 2.40.1 |
| Ruby | ruby-lsp 0.26.11 |
| Kotlin | kotlin-language-server 1.3.13 |
| HTML | vscode-html-language-server from vscode-langservers-extracted 4.10.0 |
| Twig | Twiggy bundled with extension 26.10.1 |
| Gherkin | Cucumber language-server 2.0.0 |
| C# | standalone Roslyn bundled with extension 2.160.4 |
| F# | FsAutoComplete bundled with Ionide 8.1.0 |
| Visual Basic | VbNet.LanguageServer 0.1.20; no registered Zed language adapter |
| Java | JDTLS bundled with extension 1.58.0 |
| Scala | Metals 1.6.9 |
| PowerShell | PowerShellEditorServices bundled with extension 2025.4.0 |

This is a 28-case native matrix, including cases that cannot return native tokens.
VS Code captures are not evidence of native editor compatibility. The official Julia extension's existing TextMate
test remains part of the VS Code suite and is not replaced by these tests.

## Reproduce on Windows

Install Neovim 0.12.6, the matching Zed 1.27.0 build, Node, Python 3.11+ and
PowerShell 7. `nvim.exe` and `zed.exe` must be on PATH. Native Tree-sitter parsers
and matching Zed sources are prepared by `npm run prepare:languages:native`.
This harness currently reuses the isolated servers prepared under
`test-results/semantic-ci/` by `ports/vscode/scripts/prepare-semantic-ci.ps1` for
groups `native,bundled,julia,rust,go,dart,jvm,ruby,web,dotnet`; prepare those dependencies
first. It does not search or change normal editor installations/extensions.

```powershell
npm ci
npm run build
npm run prepare:semantic:native
$cases = 'c,cpp,objectivec,typst,lua,rust,go,dart,julia-fatou,julia-jetls,javascript,jsx,typescript,tsx,python,toml,terraform,ruby,kotlin,html,twig,gherkin,csharp,fsharp,visualbasic,java,scala,powershell'
npm run capture:semantic:native -- -Editor neovim -Languages $cases
npm run capture:semantic:native -- -Editor zed -Languages $cases
npm run test:semantic:native
```

Node LSP packages and the hash-pinned official Taplo archive are installed only
under `test-results/native-semantic/runtimes`. Zed language extensions are installed
only in each test profile; their own updates can change language rules, so the
validator reads the installed configuration and records the resulting rules hash.
New captures use a new workspace and Zed profile keyed by run ID, so restored
buffers and duplicate declarations from an earlier run cannot contaminate them.
On Windows the harness opens the workspace first, disables input only on the
window belonging to the Zed child process it created, and restores the preceding
foreground window if Zed took focus. It then opens the actual sample through the
normal CLI. Source hashes independently reject any accidental buffer mutation.
That owned window is re-enabled during cleanup and its process tree is closed.
Workspace trust is enabled only inside these disposable profiles. No ordinary editor setting
is changed. Servers may download their own dependencies during initialization.

Reports live in `test-results/native-semantic/`: each editor/case has its launch
configuration, protocol trace and native capture/status. `validation.md` provides a
readable matrix; `validation.json` contains
the matrix, client/server identity, sample and trace hashes, fallback counts,
per-variant findings and totals. Inspect this generated report for the result of
the current run. Subset validation is available with
`node tooling/validate-native-semantic.mjs neovim julia-fatou,julia-jetls`; it writes
a subset report, so run the complete validator for a final combined report.

The small unit tests in `native-semantic.test.mjs` exercise Unicode decoding,
stale-capture rejection and Zed rule precedence. Those synthetic unit fixtures
are separate from the real-provider acceptance results.

Neovim retries native semantic refreshes while a project server initializes; the
trace retains the original errors and `refreshRequests` records these retries.
For the disposable Scala fixture only, its native client accepts Metals' **Import
build** request. Other interactive requests receive no selected action. Missing
language support or absent capabilities are reported without inventing tokens.
