# Noctis2 for Neovim

Eleven variants, native Lua, no Node dependency at runtime. An independent fork
of [Noctis by Liviu Schera](https://github.com/liviuschera/noctis).
The native runtime is tested with Neovim 0.12.6.

Clone the repository and add its port directory to your `init.lua` before loading:

```lua
vim.opt.runtimepath:prepend('/absolute/path/to/Noctis2/ports/neovim')
require('noctis2').setup({ variant = 'noctis' }) -- optional
vim.cmd.colorscheme('noctis2')
```

With a plugin manager, use this directory as the local plugin root (for example,
`dir = '/absolute/path/to/Noctis2/ports/neovim'` in lazy.nvim). The monorepo root
is not the runtime root. A separate installation repository is not required.

Direct commands also work, without calling setup:
`:colorscheme noctis2-lux`, `noctis2-hibernus`, `noctis2-lilac`, `noctis2-noctis`,
`noctis2-azureus`, `noctis2-obscuro`, `noctis2-sereno`, `noctis2-minimus`,
`noctis2-bordo`, `noctis2-uva`, `noctis2-viola`.

```lua
require('noctis2').setup({
  variant = 'noctis',
  transparent = false,
  italic = true,
  bold = true,
  overrides = { Comment = { fg = '#5b858b', italic = true } },
})
vim.cmd.colorscheme('noctis2')
```

Setup updates options; reload the colorscheme to apply them. Overrides are applied
last. Transparency removes editor, float and sign-column backgrounds; deliberate
selection, popup-selection and panel backgrounds remain. Truecolor is enabled.

Includes native UI, diagnostics, diff, terminal ANSI, legacy syntax, Tree-sitter
captures and LSP highlight groups, including scoped Tinymist styles. Language
parsers and servers remain the user's choice. This does not validate every
language/provider combination or add third-party plugin-specific groups.

Development: from the repository root run `npm run build -- neovim`. Edit native
mappings in `lua/noctis2/`; edit colors in `../../core/src/`. Never hand-edit
`lua/noctis2/generated/` or `colors/`. Tests require `nvim` on PATH or an `NVIM`
environment variable pointing at its executable.
