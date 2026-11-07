# Noctis2

Eleven light and dark color variants with a shared core and independent editor
integrations. An independent fork of [Noctis](https://github.com/liviuschera/noctis)
by **Liviu Schera and the upstream contributors**; not an official Noctis release.

- **Dark:** Noctis2, Azureus, Bordo, Obscuro, Sereno, Uva, Minimus and Viola.
- **Light:** Lux, Hibernus and Lilac.

| Editor | Installation and native source |
| --- | --- |
| VS Code | [VSIX and language support](ports/vscode/README.md) |
| Zed | [Local theme family](ports/zed/README.md) |
| Neovim | [Native Lua runtime](ports/neovim/README.md) |

Zed and Neovim are new local integrations, not published packages. All eleven
VS Code theme files retain the complete pre-migration output, including semantic
selectors and TextMate rule order. Rendering across editors depends on their
language grammars, semantic token providers and UI capabilities.

## Development

Use Node.js/npm and Neovim on PATH (or set `NVIM` to its executable).
CI uses Node 26.8.1 and Neovim 0.12.6.

```sh
npm ci --ignore-scripts
npm run build
npm run check
npm run audit:compatibility -- --strict
npm run package:ports
npm run package:vsix -- --out test-results/noctis2.vsix
npm run inspect:vsix -- test-results/noctis2.vsix test-results/vsix-report.json
```

Build one editor with `npm run build -- zed` (or `vscode`, `neovim`). A second
argument selects an output directory, containing that port's generated resources.
All-port builds also export `dist/data/noctis2.json` for tools and a future website.

Edit colors and shared roles in `core/src/`, native mappings in `ports/<editor>/`.
See the [core contract and guide to adding editors](core/README.md). Generated
files are committed so editor users do not need the toolchain. Tests protect full
VS Code output, native Zed schema, Neovim loading, release verification and VSIX
contents. Some original palette colors have low contrast; this migration does
not redesign them or establish accessibility compliance.

For visual comparison, open the shared [language samples](tests/samples/README.md).
All source examples live together in `tests/samples/languages/`; the catalogue
and instructions stay in `tests/samples/`.

The root package is private tooling. The VS Code identity, version and changelog
live in `ports/vscode/`; its [release process](ports/vscode/README.md#publishing-releases)
still publishes the exact validated CI artifact. New ports have independent
native distributions. Nothing is published by the build or test commands.

[License](LICENSE.md) · [VS Code changelog](ports/vscode/CHANGELOG.md)
