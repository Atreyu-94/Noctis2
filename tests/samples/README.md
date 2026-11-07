# Language samples

Open `languages/` in VS Code, Zed or Neovim and compare the same source files
across all eleven Noctis2 variants. These fictional observatory examples combine
meaningful code and documents with varied syntax. The 62 files cover the 61
language/dialect cases in Noctis's original support list plus Typst. No sample
fetches external data. Some examples need their language toolchain, framework
or template host to execute; they are highlighting fixtures, not a universal
compilation suite. Configuration files are examples, not deployment instructions.

`catalog.json` is the shared list of language IDs, filenames and covered syntax.
All three ports' language tests use it to locate their selected samples. It contains no expected
colors: native scopes/captures and assertions belong to each editor's tests,
and expected colors come from the core. Adding a sample does not establish
support in every grammar, language server or editor.

The table below describes the original eight-file cross-editor matrix. The
catalogue additionally inventories C/C++, .NET, JVM, functional languages,
web templates/styles, configuration formats and the other original Noctis
languages. Neovim and Zed currently test those original eight samples only;
the expanded compatibility matrix belongs to the VS Code port.

| File | Purpose | Optional execution |
| --- | --- | --- |
| `simulation.py` | Normalize observations and handle invalid input | Python 3.10+ |
| `analysis.jl` | Calibrate a signal matrix and summarize targets | Julia |
| `catalog.ts` | Validate and index a typed observation catalogue | TypeScript compiler, then Node |
| `components.tsx` | Render an observation panel to plain objects | TypeScript with `--jsx react --jsxFactory element`, then Node |
| `report.typ` | Scientific note with equations, tables and references | Typst |
| `notes.md` | Observation notebook with embedded Python/JSON | Markdown viewer |
| `observatory.json` | Nested session configuration and measurements | JSON parser |
| `configuration.lua` | Schedule observations through callbacks | Lua or `nvim --headless -u NONE -l` |

For a visual check, inspect declarations versus uses, properties, comments,
strings and interpolation, punctuation, and nested emphasis. Compare ordinary
grammar highlighting with semantic highlighting when the editor/provider offers
it. Check both a dark and a light variant before reviewing the full matrix.

Run `npm run check` for the shared sample inventory and TypeScript/TSX validity
alongside the theme tests. `npm run test:languages` checks all eleven VS Code
variants using installed grammars: set `TINYMIST_EXTENSION` and `JULIA_EXTENSION`;
set `VSCODE_EXTENSIONS` to include Python, JSON, Markdown, TypeScript, TSX and Lua.
`npm run inspect:tinymist` uses `TINYMIST_BIN` to inspect actual semantic tokens.
These checks do not replace visual review in Zed or Neovim.

### Original Noctis compatibility (VS Code)

Run `npm run prepare:languages:upstream`, then `npm run test:languages:upstream`.
Preparation downloads the pinned original themes/README and four additional
grammars to `test-results/upstream-languages/`. The other grammars come from the
exact development dependency `@shikijs/langs@4.6.0` (real TextMate definitions).
The runner uses VS Code's `vscode-textmate` and Oniguruma, not Shiki's renderer.

The matrix must account for every upstream README entry. C/C++, Sass/SCSS and
TypeScript/TSX have separate fixtures; Markup and Other are category headings.
This gives 61 original cases, plus the separately tested Typst sample. For each
original case and all eleven variants, the test compares foreground, background
and font style at every non-whitespace UTF-16 position. Only the already
documented Julia interpolation and combined Markdown emphasis changes are
permitted. It also requires nontrivial grammar scopes and multiple colors,
so identical plain-text fallback cannot count as a successful language test.

The report `test-results/upstream-language-validation.json` records sample and
grammar hashes, root scopes, character counts, intentional changes and missing
optional grammar references. Sources are fixed in
`ports/vscode/tests/upstream-grammars.json`; the per-language mapping is in
`ports/vscode/tests/upstream-languages.json`. EJS is injected into HTML as its
extension specifies. MJML, ReasonML and PlantUML use their extension grammars.

This tests these specific fixtures and grammar versions, not every provider or
editor rendering. Optional references to assembly, SassDoc, legacy scope names
and other embedded formats remain listed gaps; they are not silently replaced
by unrelated grammars. The exact gap inventory is checked for changes. The
expanded suite does not run language servers, compile all samples or establish
visual acceptance. The existing eight-language provider checks remain separate.

### Native grammar and provider checks

Run `npm run prepare:languages:native` once before the native grammar checks.
Preparation requires PowerShell 7, Python 3.11+, network access and a C compiler
(Visual Studio C++ Build Tools on Windows; `cc` on Linux). It downloads sources
pinned in `tests/native-languages.lock.json`, compiles the parsers, and installs
the test-only Python Tree-sitter binding under ignored `test-results/`. Nothing
is installed into an editor profile or the global Python environment. Run it
again after updating the lock file. Downloaded sources retain upstream licenses.

- `npm run test:languages:neovim`: real Neovim Tree-sitter captures and resolved
  highlight groups, including Markdown Python/JSON fences; 25 probes per variant.
  Tested with Neovim 0.12.6. Set `NVIM` to override the executable.
- `npm run test:languages:zed`: pinned Zed 1.27.0 and extension grammars/queries,
  using Python Tree-sitter outside Zed; 25 probes per variant. It checks the
  longest dotted capture prefix against the generated theme. Set `PYTHON` to
  override the executable used by preparation and this test.
- `npm run test:languages:tinymist`: real Tinymist tokens received through
  Neovim's LSP client, with four token/style probes per variant. Set `TINYMIST_BIN`
  to the server executable (locally tested with 0.15.12). This is a separate
  provider check and is not part of CI's grammar job.

Expectations live in each port's `tests/`, and JSON reports are written under
`test-results/`. CI runs both grammar suites on Linux and Windows. Reports
identify the locked inputs and selected captures; Zed also records parse errors
and unevaluated injections. Its harness evaluates contiguous Markdown injections;
other injections and parsers outside the matrix remain explicit gaps. It does
not run Zed's application, semantic-token pipeline or renderer. These checks
verify selected captures and their styles, not the final precedence of every
overlapping capture or semantic token on screen. Visual acceptance remains a
separate check.

Examples, from the repository root:

```sh
python tests/samples/languages/simulation.py
julia --startup-file=no tests/samples/languages/analysis.jl
typst compile tests/samples/languages/report.typ test-results/sample-report.pdf
nvim --headless -u NONE -l tests/samples/languages/configuration.lua
```

Write generated PDFs/JavaScript into `test-results/`, not into `languages/`.
Keep each assertion's source-line anchor unique. Tests select a token within a
recognizable source line instead of relying on a fixed line number. Keep
language-specific regressions when expanding a sample. Add another directory
only when an example genuinely requires related files.
