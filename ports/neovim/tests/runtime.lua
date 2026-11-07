vim.opt.runtimepath:prepend(vim.env.NOCTIS2_RTP or (vim.fn.getcwd() .. '/ports/neovim'))
local function color(hex) return tonumber(hex:sub(2), 16) end
local function hl(name) return vim.api.nvim_get_hl(0, { name = name, link = false }) end
local variants = require('noctis2.generated.variants')
local count = 0
for id, appearance in pairs(variants) do
  vim.cmd.colorscheme('noctis2-' .. id)
  local t = require('noctis2.generated.' .. id)
  assert(vim.g.colors_name == 'noctis2-' .. id)
  assert(vim.o.background == appearance)
  assert(hl('Normal').bg == color(t.ui['surface.editor']), id .. ': Normal')
  assert(hl('@function').fg == color(t.syntax['function'].fg), id .. ': Treesitter')
  assert(hl('@tag.builtin').fg == color(t.syntax.tag.fg), id .. ': TSX builtin tag')
  assert(hl('@lsp.type.function').fg == color(t.syntax['function'].fg), id .. ': LSP')
  assert(hl('Visual').bg == color(t.ui['selection.editor']), id .. ': selection')
  assert(hl('PmenuSel').bg == color(t.popupSelection), id .. ': popup selection')
  assert(vim.g.terminal_color_1 == t.ui['terminal.red'])
  count = count + 1
end
local theme = require('noctis2')
assert(not pcall(theme.setup, { variant = 'missing' }))
assert(not pcall(theme.setup, { transparent = 'yes' }))
theme.setup({ variant = 'lux', transparent = true, bold = false, italic = false })
vim.cmd.colorscheme('noctis2')
assert(hl('Normal').bg == nil)
assert(not hl('Noctis2_heading').bold)
theme.setup({ transparent = false, bold = true, italic = true, overrides = { Normal = { fg = '#123456' } } })
vim.cmd.colorscheme('noctis2-noctis')
assert(hl('Normal').fg == 0x123456)
assert(count == 11)
print('11 variants verified')
