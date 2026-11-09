# Noctis2 for Zed

Eleven variants generated from the shared Noctis2 core. An independent fork of
[Noctis by Liviu Schera](https://github.com/liviuschera/noctis), preserving its palettes.

For local installation, copy `themes/noctis2.json` into Zed's user themes folder:
`~/.config/zed/themes` on macOS/Linux, or `%APPDATA%/Zed/themes` on Windows.
Restart Zed and use **theme selector: toggle** to choose a Noctis2 theme.
Alternatively, use **Install Dev Extension** and select this `ports/zed` directory.
This port is not yet published to the extension registry.

Developers run `npm run build -- zed` from the repository root. Edit `src/build.ts`
for native mappings and `../../core/src/` for shared colors. Do not edit the
generated family. `tests/theme-schema.json` vendors the official
[v0.2.0 theme schema](https://zed.dev/schema/themes/v0.2.0.json).

The theme supplies UI, ANSI and syntax styles. Language extensions and Zed's
semantic-token rules decide which styles apply. It installs no language servers,
grammars or semantic-token settings. Typst/Julia parity with VS Code is not
guaranteed. Underline and strikethrough are omitted because the supported schema
does not expose them; bold and italic are retained. Missing UI properties use
Zed's native defaults for the selected light/dark appearance.

See [Zed's theme documentation](https://zed.dev/docs/themes) for native installation.

Real Zed LSP captures and the eleven-variant semantic style model are documented
in [the native semantic test guide](../../tests/native-semantic.md). Model checks
are distinct from visual renderer acceptance.
Merge the generated [`semantic-settings.json`](semantic-settings.json) fragment
into your Zed settings to use the tested semantic mappings. Preserve your other
settings and any existing `global_lsp_settings` fields. The fragment enables
`"semantic_tokens": "combined"` and supplies
`global_lsp_settings.semantic_token_rules` for declarations, readonly symbols and
provider-specific types. It references style names, so the same fragment follows
all eleven variants without duplicating palette colors. It is also included in
the native ZIP; installing the theme alone does not install these settings.

These rules are global: remove or adapt them when switching to another theme.
The settings can apply semantic modifier decorations such as strikethrough,
independently of the more limited theme schema described above.
