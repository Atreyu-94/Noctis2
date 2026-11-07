# Noctis2 core

`src/variants/` is the editable source for all eleven palettes, appearances and
54 shared UI/terminal roles. `src/roles.ts` assigns semantic syntax roles to
palette entries. Equal values are not automatically merged: a background and a
foreground with the same value still have different purposes.

`getTheme(id)` returns independent data; `listVariants()` provides metadata.
`contractVersion` versions the resolved data shape, independently of native
extension versions. `npm run build` exports `dist/data/noctis2.json` for other
consumers, including a future website. The core imports no editor or filesystem APIs.

```text
core/src/variants + core/src/roles
                 |
      +----------+----------+
      |          |          |
ports/vscode ports/zed ports/neovim
      |          |          |
 theme JSON   family JSON   native Lua
```

## Editing and adding ports

Change shared color intent in the core; change native property names, scopes and
highlight groups in the owning port. VS Code's remaining workbench colors are
explicit native exceptions, retained to avoid losing existing distinctions.
Do not derive another port by reading VS Code's generated themes.

1. Create `ports/<editor>/` with native mappings, tests, installation instructions
   and required package resources.
2. Implement `src/build.ts` with `build(outputDirectory)` and consume `getTheme`
   for every `variantIds` entry. Register the function in `tooling/build.ts`.
3. Declare native limitations in the port README. Reuse shared roles; extend the
   core only when a missing concept has a meaningful portable definition.
4. Test the native schema/runtime, all variants, generated-file freshness and
   installation. Run `npm run check` to protect existing editors.

Do not edit generated JSON/Lua, migration baselines or exported JSON to change a
theme. The frozen VS Code baseline records full outputs from commit
`0d9d2faa92cdac116f1d0812ed6779c1b3150be1`; intentional future palette changes need
an explicitly reviewed baseline change.

## Alpha and styles

Authored hexadecimal spelling and alpha remain unchanged for VS Code and Zed.
Neovim requires RGB: its adapter composites encoded sRGB channels on the actual
destination surface, preserving the exact alpha byte and rounding once. Editor
selections use the editor background; completion selections use the popup
background; ANSI colors use the terminal background. This does not promise
identical terminal and GUI rendering.

Style attributes are partial: absent means inherit, `false` means disable. Each
editor controls precedence between its grammar and semantic tokens. The core
does not attempt to translate grammars or run language servers.

| Capability | VS Code | Zed | Neovim |
| --- | --- | --- | --- |
| Eleven palettes | Native JSON | One theme family | Generated Lua |
| Syntax | TextMate + semantic selectors | Native capture/style names | Legacy + Tree-sitter + LSP groups |
| Alpha | Preserved | Preserved | Composited RGB |
| Bold/italic | Preserved | Preserved | Configurable |
| Underline/strike | Native | Not emitted by this schema adapter | Native |
| Third-party plugin groups | Existing language scopes | Language extensions supply rules | Not yet included |

The root npm package is private build tooling. Each editor owns its native
manifest/version and can be packaged independently. Existing verified VSIX
release workflows remain specific to VS Code; publishing the new ports is separate.
