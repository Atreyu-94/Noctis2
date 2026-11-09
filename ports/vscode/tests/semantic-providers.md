# Semantic provider coverage

`semantic-providers.json` inventories all 62 sample languages and separate Julia/JETLS and Julia/Fatou cases. The optional `sample` field references an existing catalogue entry; it does not duplicate the source sample. A configured
provider is a VS Code extension ID; a candidate is only a language-server
implementation found in the [LSP implementor catalogue](https://github.com/microsoft/language-server-protocol/blob/gh-pages/_implementors/servers.md).
Being listed there does not establish semantic-token support. Unselected
providers, untested candidates and providers from which no tokens were observed
remain distinct states. None count as a passed semantic test.

## Reproduce locally

On Windows with PowerShell 7 and VS Code installed:

```powershell
npm run capture:semantic
npm run test:semantic:providers
# Retry a subset after investigating a provider error:
pwsh -NoProfile -File ports/vscode/scripts/capture-semantic-providers.ps1 -Languages typst,c,cpp
```

The capture script accepts `-Julia` for the Julia executable, and `-Code` and `-Extensions` to override local executable
and installed-extension paths. It uses an isolated profile, extensions directory
and per-language copies of the shared samples under `test-results/semantic-providers/`.
Selected installed extensions are loaded as development extensions; their
source files and the user's ordinary settings are not edited. This invokes
VS Code's extension host and editor document attachment, not computer-use or
visual acceptance. Runtime preparation is separate; extensions may bootstrap
their server dependencies on first activation. Nothing is published.
Language lists run sequentially in separate VS Code processes, with only the
selected extension, its declared dependencies and explicit `supportExtensions` enabled. Ionide requires the pinned C# extension to remain enabled even though it is listed in an optional extension pack; otherwise its activation waits on an interactive error notification. Julia alternatives retain the official Julia extension for its language registration and TextMate grammar; its LanguageServer does not implement semantic tokens. Startup has a
180-second limit; each complete host run has a 15-minute limit. A failed startup
is recorded even if no test-host report was produced, and does not reuse an old
successful capture. Other languages in a list are still attempted.

The host activates each configured provider and calls the official
[`vscode.provideDocumentSemanticTokens` commands](https://code.visualstudio.com/api/references/commands),
including the range variants when needed. Reports retain the actual legend,
raw data, decoded tokens, diagnostics, provider and VS Code versions, sample
hashes, grammar locations and extension-contributed semantic types/scopes.
Cancellation during C/C++ indexing is retried within a bounded window. A
timeout or empty response is reported, never turned into invented tokens.

The validator merges captures by timestamp, rejects stale sample/provider data,
and tests all eleven variants. It uses the installed TextMate grammars and an
**offline model** of VS Code 1.145.2's semantic selector specificity,
property-wise precedence, custom subtype inheritance and scope fallback. The
scope matcher is the upstream implementation with TypeScript types removed;
its source attribution and MIT license are in `references/`. Token overlays
are sampled at token starts, with examples for every observed type/modifier
combination. This is not a measurement of rendered pixels or a complete editor
integration test of every position in a multi-scope token.

`semantic-probes.json` adds concrete checks against core roles for declarations,
readonly properties, Pylance subtypes, C++ template tokens, PowerShell decorators,
Taplo array keys and Tinymist combined emphasis. Missing providers do not
silently satisfy these checks. The normal unit suite separately tests the
model against these precedence cases; a passing model test is not a passing
provider audit.

## Evidence from 2026-11-07

VS Code 1.145.2 returned 1,316 visible semantic tokens across 11 language cases:
JavaScript, JSX, TypeScript, TSX, Python, Typst, C, C++, PowerShell, TOML and HTML
(embedded JavaScript). Versions: built-in extensions 10.0.0, Pylance 2026.4.1,
Tinymist 0.15.12, C/C++ 1.35.6, PowerShell 2025.4.0 and Even Better TOML 0.21.2.
The first pass gave 14,476 token/variant resolutions. Six attempted cases produced no
semantic tokens: Julia 1.250.2 and built-in CSS, SCSS, JSON, Markdown and PHP.
This does not prove that every configuration or alternate provider lacks them.
The follow-up below expands this initial coverage.

### Additional providers

The follow-up captured 438 additional visible tokens from seven language cases:

| Sample | Extension and version | Visible tokens |
| --- | --- | ---: |
| Lua | sumneko.lua 3.19.2 | 145 |
| Rust | rust-lang.rust-analyzer 0.3.3105 | 62 |
| Terraform | hashicorp.terraform 2.40.1 | 26 |
| Java | redhat.java 1.58.0 | 42 |
| C# | ms-dotnettools.csharp 2.160.4 | 107 |
| F# | ionide.ionide-fsharp 8.1.0 | 34 |
| Gherkin | cucumberopen.cucumber-official 1.12.1 | 22 |

Together these are **18 captured language cases, 1,754 visible tokens and 19,294
token/variant resolutions**. Concrete core-role probes additionally cover Rust
structs, Java records, C# record classes, F# readonly properties, Lua parameters,
Terraform subtypes and Cucumber keywords/placeholders. No new color finding was
detected by these checks; this does not establish that every emitted token has
an independently specified expected color.

The following additional providers were attempted without a successful token
capture. These are not counted as passed cases:

| Sample | Extension version | Observed result / remaining prerequisite |
| --- | --- | --- |
| PHP | Intelephense 1.18.5 | Activated and indexed; no semantic tokens observed |
| GraphQL | GraphQL 1.0.0 | No tokens observed; schema/project setup remains unverified |
| LaTeX | LaTeX Workshop 10.20.0 | Parsed the sample, no tokens observed; TeX class lookup failed |
| Shell | Bash IDE 1.43.2 | No tokens observed |
| CoffeeScript | CoffeeSense 1.15.0 | Server initialized with bundled TypeScript, no tokens observed |
| HLSL | HLSL Tools 1.1.303 | Language client started, no tokens observed |
| Ruby | Ruby LSP 0.10.8 | Activation timeout during runtime discovery; no Ruby executable on PATH |
| Kotlin | Kotlin 0.2.36 | After isolated onboarding/bootstrap, server fails parsing Java 25.0.4.1; needs a compatible JDK |
| Clojure | Calva 2.0.609 | Extension-test host exits before capture finishes, including retry with minimal deps.edn |

There are 30 sample cases still without an attempted real provider. The full
generated matrix distinguishes these from empty responses, provider errors and
incomplete captures. Calva is disabled for unrelated capture subsets so its
host termination does not prevent other tests. The wrapper rejects incomplete
runs even if VS Code exits with code zero.

New extensions were installed only in the isolated directory. To reproduce a
specific installation, use its exact ID and version from the table, for example:

```powershell
code --user-data-dir test-results/semantic-providers/profile --extensions-dir test-results/semantic-providers/extensions --install-extension sumneko.lua@3.19.2
pwsh -NoProfile -File ports/vscode/scripts/capture-semantic-providers.ps1 -Languages lua,rust,terraform,java,csharp,fsharp,gherkin
```

The tested Windows environment has Rust 1.99.1 and .NET SDK 10.0.403. The script
creates a dependency-free Cargo project and .NET 10 projects using unchanged
sample copies. Red Hat Java supplies its bundled JRE 25.0.4.1; the script exposes
it only to the capture process. Kotlin's first-run state is initialized only in
the isolated profile, with its debugger disabled. Runtime/compiler diagnostics
remain in captures; successful semantic tokens do not imply a clean build.

LuaLS encodes some multiline-token line endings with column 9999. The host
retains these original ranges as `endOfLineTokens` and checks the visible text.
The [LSP encoding specification](https://github.com/microsoft/language-server-protocol/blob/gh-pages/_specifications/lsp/3.17/language/semanticTokens.md)
allows clipping past-line lengths when multiline tokens are unsupported. This
was a capture-decoder limitation, not a theme defect. Terraform also shares a
TextMate scope across several language IDs; the validator preserves each alias.
Cucumber supplies no TextMate grammar in this installation. Its semantic tokens
are overlaid on the plain editor foreground, recorded explicitly in
`plainTextFallbackLanguages` rather than substituting another language's grammar.

The initial audit identified **one color issue in all eleven variants**: Pylance emits
Python `\n` as `string.escapeCharacter`. The theme's generic `string` foreground
overrides Pylance's more specific fallback to `constant.character.escape.python`,
so it received string color instead of the core escape color. The correction
adds `string.escapeCharacter:python` using the existing core escape role.
Fresh Pylance 2026.4.1 capture returned the same 178 tokens; the regression checks
cover the escape color in all eleven variants, ordinary strings and language
isolation. Palette values are unchanged. The audit still exits nonzero if this
regression returns; no finding is allowlisted.

Tinymist also emitted 71 tokens containing or consisting of CRLF/LF terminators.
The host retains these separately, validates their overflow is only a line
terminator and checks their visible portions. The report does not present these
as 71 additional visible tokens. Diagnostics and unresolved optional embedded
TextMate scopes remain in the reports as limits of the tested environment.

Generated evidence (local, ignored):

- `test-results/semantic-providers/capture*.json`: raw provider captures.
- `test-results/semantic-providers/validation.json`: resolutions, role checks and findings.
- `test-results/semantic-providers/matrix.md`: readable complete matrix.

## Evidence from 2026-11-08

All 30 previously unattempted sample cases now have an attempted extension or
provider recorded. This is **not** 62 successful semantic integrations. The
current matrix has 26 captured cases, 30 cases with no tokens observed, four
declarative-only extensions, one provider error (Nim), and one incomplete host
capture (Clojure). No case remains in the unattempted/selection-pending states.

The final audit resolves **2,108 visible tokens across eleven variants: 23,188
token/variant cases and 451 core-role assertions**, with zero findings in those
checks and no missing required probes. The general suite also passes all 48
tests. These are token-resolution checks, not visual acceptance or a complete
specification of every token's intended appearance.

| Newly captured case | Extension | Visible tokens |
| --- | --- | ---: |
| Ruby | Shopify Ruby LSP 0.10.8; server 0.26.11 | 7 |
| Kotlin | fwcd.kotlin 0.2.36; server 1.3.13 | 36 |
| Twig | moetelo.twiggy 26.10.1 | 58 |
| Go | golang.go 0.58.0; gopls 0.24.0 | 54 |
| Dart | Dart-Code.dart-code 3.146.0; SDK 3.13.7 | 64 |
| Objective-C | clangd extension 0.6.0; clangd 22.1.6 | 6 |
| Visual Basic | dnakode.vbnet-language-support 0.1.20 | 69 |
| Scala | scalameta.metals 1.72.0 | 60 |

Ruby's runtime-discovery blocker was resolved with portable Ruby 4.0.9 and an
explicit local Gemfile. Reusing its bundled RBS 3.10.0 and Prism 1.8.2 avoids
requiring a separate native build toolchain for this fixture. Kotlin uses
Temurin 21.0.13+9 and a project-local `kls-classpath.cmd` exposing the server's
bundled standard-library jars. Its first JDK-corrected capture had 25 tokens;
the classpath-corrected capture has 36. Scala needed server bootstrap and an
sbt project (Scala 2.13.18, sbt 1.11.7) with automatic build import enabled.
Server startup still uses the available Java environment; Java language support
retains its explicit bundled JRE setting. Runtime archive versions, URLs and
hashes are recorded in `semantic-provider-versions.json`.

Objective-C remains a **limited** semantic sample on this Windows environment:
clangd reports missing Foundation headers and unresolved platform types. The
six emitted tokens and their core-role probes pass; that does not validate all
Foundation-dependent identifiers or establish a working Objective-C SDK.

Clojure was retried with its own profile/project, unrelated extensions disabled,
an explicit native clojure-lsp 2026.10.15-11.42.38 executable, and Calva versions
2.0.609 and 2.0.580. The executable reports its version successfully, but the
VS Code extension-test host exits before producing a capture when Calva starts.
The cause is unresolved; this is not evidence that the theme or the native
server's semantic-token implementation is faulty. Clojure remains unvalidated.
Nim's extension fails during activation with a null tool-path argument; its
compiler/toolchain was not prepared, and no semantic pass is claimed.

EJS, Handlebars, Pug and Apache use selected extensions without executable entry
points, recorded as `declarative-extension-only`. This describes those specific
extensions, not every possible provider for those languages. The new empty
responses are Apex, Crystal, Sass, Elm, Elixir, Erlang, Groovy, Haskell, AsciiDoc,
MJML, Blade, PlantUML, OCaml, R, Reason, SQL, Swift, Vala and Zig. Logs include an
`escript` launch failure for Erlang, Dune/ENOENT failures for OCaml and Reason,
and Elixir server exits. Elm was given its compiler and a minimal project, but
still returned no tokens in the bounded attempt. These cases need provider or
runtime work before being made required semantic CI checks; empty responses
are not color failures or proof that semantic support is unavailable.

The launcher now isolates both the sample project and enabled extensions per
provider. It records failed/incomplete startup instead of silently accepting a
zero exit code, continues the other requested providers, and rejects stale
reports. The validator reads only grammars actually used by the audited tokens;
unrelated removed extension versions no longer invalidate other languages.

## CI with real providers

`.github/workflows/semantic-providers.yml` runs on Windows Server 2025. The
main validation workflow calls it for pushes, pull requests and manual runs;
packaging depends on its success. It can also be dispatched independently.
No publishing permissions or secrets are required.

`semantic-ci.json` partitions all 28 cases with real-token probes into eleven
jobs, plus the official Julia TextMate baseline. Each job installs VS Code
1.145.2 and the extension/runtime versions in `semantic-provider-versions.json`,
opens isolated copies of the samples in a real extension host, and validates
all eleven theme variants on the same runner as the installed grammars.
Unresolved/unsupported providers from the wider inventory are not silently
accepted or represented as successful CI cases.

- `--languages` limits validation to the job's cases and requires every selected
  semantic case to return tokens and satisfy its probes in all eleven variants.
- `--run-id` accepts only captures from that workflow run/attempt/group. Cached
  captures or an empty server response cannot make the job pass.
- `--strict-pins` checks the captured provider version; preparation also checks
  installed dependencies. VS Code's version must match the pinned style model.
- Julia's official case requires its actual TextMate grammar. JETLS and Fatou
  remain independent semantic cases; unspecified JETLS tokens preserve syntax.
- The matrix uses `fail-fast: false`. Capture failures do not cancel other jobs.
  Validation runs after failed captures, and captures, preparation metadata,
  resolved styles, the matrix and extension-host logs are uploaded even on failure.

Caches contain installations, runtime caches and extension global storage, never
capture JSON, workspace samples or validation results. Cache keys include the
versions, group definitions and preparation/capture scripts. Archives have fixed
URLs and checksums; Rust is selected through an isolated rustup toolchain.
Provider-specific dependency resolution (for example Ruby gems, Maven/Coursier
artifacts and extension-managed server bootstrap) is not a complete transitive
lockfile. Runner-provided PowerShell and C/C++ system tools also follow the
Windows image. A network/bootstrap failure is a failing job, not a semantic pass.

Cold JETLS preparation runs before the editor, using a pinned `Pkg.Apps`
environment and two precompile tasks. This avoids the client-managed installer's
fixed fifteen-minute timeout. The client then launches that prepared server via
its supported custom-command setting. The job allows thirty minutes for a
provider response and forty minutes per host, within a sixty-minute job limit.
Individual JETLS token requests allow five minutes for the first analysis on
a cold runner; other providers retain a 45-second request deadline. Registration
alone does not mean that first analysis has finished compiling. Other groups
use shorter overall response deadlines. Desktop visual acceptance and
real LSP captures in Neovim/Zed remain separate from these VS Code tests.

To reproduce one CI group locally on Windows (build the themes first):

```powershell
npm run build
./ports/vscode/scripts/prepare-semantic-ci.ps1 -Group julia
$launch = Get-Content test-results/semantic-ci/julia/launch.json -Raw | ConvertFrom-Json
$runId = [guid]::NewGuid().ToString()
./ports/vscode/scripts/capture-semantic-providers.ps1 -Code $launch.code -Extensions $launch.extensions -OutputDirectory $launch.output -Languages $launch.languages -Julia $launch.julia -JetlsDepot $launch.jetlsDepot -RunId $runId -MinimumWaitMs $launch.waitMs -HostTimeoutSeconds 2400
node ports/vscode/scripts/validate-semantic-providers.mjs --directory $launch.output --languages $launch.languages --run-id $runId --strict-pins
```

Preparation requires PowerShell 7; the Rust and Ruby groups additionally use
`rustup.exe` and `7z.exe`, supplied by the hosted Windows image. Captured grammar
paths are local to the runner: the uploaded reports are inspection evidence,
not a self-contained grammar installation for revalidation on another machine.

### Local CI-equivalent verification — 2026-11-09

All eleven groups were prepared and captured locally using the pinned CI tools,
isolated profiles and strict run IDs. Each semantic case passed all eleven
variants. These local results alone do not establish a pass on GitHub-hosted runners.

| Group | Token/variant checks |
| --- | ---: |
| Web | 4,664 |
| Lua/TOML/Terraform/Typst/PowerShell | 9,834 |
| Python | 1,958 |
| Julia: JETLS and Fatou | 2,101 |
| C/C++/Objective-C | 847 |
| Rust | 682 |
| C#/F#/Visual Basic | 2,310 |
| Java/Kotlin/Scala | 1,518 |
| Ruby | 77 |
| Go | 594 |
| Dart | 704 |
| **Total** | **25,289** |

The 28 semantic cases produced 561 core-role checks, zero findings and zero
missing mandatory captures. The official Julia grammar additionally passed
eleven TextMate baselines; JETLS preserved 638 unspecified-token fallbacks.
The general suite passed 51 tests, and actionlint 1.7.12 accepted both workflows.
Reports remain under `test-results/semantic-ci/<group>/validation.json`.

Cold-start verification exposed two setup requirements: Ionide needs the C#
extension enabled, and Kotlin must resolve its stdlib classpath when the server
invokes the hook, after its download. Kotlin now has its own profile and a
`listOf` probe so a missing stdlib cannot silently reduce coverage. Rust setup
disables rustup self-update while using an isolated toolchain directory.
Provider diagnostics are preserved and do not imply the samples compile on
Windows; these assertions concern token classifications and theme resolution.

## Julia providers

Julia keeps three independent cases using the unchanged `analysis.jl` sample:

- `julia`: official `julialang.language-julia` grammar. The validator records
  TextMate spans for every variant in `textmateResults`, even though the official
  LanguageServer does not provide semantic tokens.
- `julia-jetls`: `aviatesk.jetls-client`, with the official grammar as its syntactic
  base. JETLS custom `jetls.unspecified` tokens must leave that base unchanged.
- `julia-fatou`: `jolars.fatou`, with the same official grammar as its base.

Both alternatives have `requiredSemantic: true`: missing/empty captures fail the
semantic audit. Case IDs, rather than the shared Julia language ID, identify
captures and probes so one provider cannot replace another's results.

Install the versions recorded in `semantic-provider-versions.json` into
`test-results/semantic-providers/extensions`, then run:

```powershell
pwsh -NoProfile -File ports/vscode/scripts/capture-semantic-providers.ps1 -Languages julia,julia-fatou,julia-jetls -Julia 'C:/path/to/julia.exe'
npm run test:semantic:providers
npm run test:languages:upstream
```

The recorded Julia runtime is 1.13.2. For the original local capture command
(without `-JetlsDepot`), JETLS Client installs its pinned server
revision in `test-results/semantic-providers/runtimes/jetls`; its first compilation
can take several minutes, so the case allows ten minutes for tokens within the
existing fifteen-minute host limit. Fatou uses the binary bundled in its VSIX.
Each alternative has its own isolated VS Code profile. No global extensions or
ordinary editor settings are changed. The upstream TextMate comparison remains
in place in addition to the installed official Julia grammar baseline.

### Verified Julia results — 2026-11-09

VS Code 1.145.2, Julia 1.13.2, unchanged shared sample:

| Case | Version | Captured semantic tokens | Variants validated |
| --- | --- | ---: | ---: |
| Official Julia TextMate | extension 1.250.2 | Not provided by LanguageServer.jl | 11 |
| JETLS | client 2026.11.4, server 2026-11-04 | 116 | 11 |
| Fatou | client and bundled server 0.26.1 | 75 | 11 |

JETLS emitted 13 parameter, 7 typeParameter, 38 variable and 58
`jetls.unspecified` tokens. All 638 unspecified-token/variant combinations
preserved the official syntactic style. Probes additionally require actual
parameter, type-parameter, variable and unspecified declaration/definition
examples. Fatou probes require real namespace, type, function, macro and number
examples; its observed legend has no modifiers. Neither capture reported error
diagnostics. This validates emitted classifications, not classifications the
servers do not supply.

The installed official grammar produced 407 spans per variant (4,477 total).
The complete semantic audit now resolves 25,289 token/variant combinations,
550 role/probe checks, zero color findings and zero missing mandatory captures.
The negative check with JETLS absent returned exit 1 as expected. The 48 general
tests and 671 upstream language/variant comparisons also passed. Existing
captures for other providers were reused; the Julia alternatives were captured
in real extension hosts and their styles resolved offline. This does not claim
visual acceptance or real-provider execution in Neovim/Zed.

The first JETLS attempt exceeded the original four-minute capture window while
compiling. Its empty abandoned managed-install lock was removed after that host
terminated; the ten-minute retry completed installation and obtained tokens.
No theme-color changes were needed for either Julia provider.
