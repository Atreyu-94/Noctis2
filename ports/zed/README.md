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
