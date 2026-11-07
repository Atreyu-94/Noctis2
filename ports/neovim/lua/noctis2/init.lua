local M = {}
local options = { variant = 'noctis', transparent = false, italic = true, bold = true, overrides = {} }
local variants = require('noctis2.generated.variants')

function M.setup(opts)
  opts = opts or {}
  assert(type(opts) == 'table', 'Noctis2 setup expects a table')
  for key, value in pairs(opts) do
    assert(options[key] ~= nil, 'Unknown Noctis2 option: ' .. key)
    assert(type(value) == type(options[key]), 'Invalid Noctis2 option: ' .. key)
  end
  if opts.variant then assert(variants[opts.variant], 'Unknown Noctis2 variant: ' .. opts.variant) end
  options = vim.tbl_deep_extend('force', {}, options, opts)
end

function M.load(variant)
  local id = variant or options.variant
  assert(variants[id], 'Unknown Noctis2 variant: ' .. tostring(id))
  local theme = vim.deepcopy(require('noctis2.generated.' .. id))
  vim.o.termguicolors = true
  vim.o.background = theme.appearance
  vim.cmd('highlight clear')
  vim.g.colors_name = variant and ('noctis2-' .. id) or 'noctis2'

  local groups = require('noctis2.ui').groups(theme, options)
  for name, value in pairs(require('noctis2.syntax').groups(theme)) do groups[name] = value end
  for name, value in pairs(require('noctis2.treesitter').groups()) do groups[name] = value end
  for name, value in pairs(require('noctis2.lsp').groups()) do groups[name] = value end
  for _, value in pairs(groups) do
    if not options.italic then value.italic = false end
    if not options.bold then value.bold = false end
  end
  -- User overrides are last; linked groups must be replaced to add attributes.
  for name, value in pairs(options.overrides) do groups[name] = vim.deepcopy(value) end
  for name, value in pairs(groups) do vim.api.nvim_set_hl(0, name, value) end
  local names = { 'black', 'red', 'green', 'yellow', 'blue', 'magenta', 'cyan', 'white' }
  for i, name in ipairs(names) do
    vim.g['terminal_color_' .. (i - 1)] = theme.ui['terminal.' .. name]
    vim.g['terminal_color_' .. (i + 7)] = theme.ui['terminal.bright' .. name:gsub('^%l', string.upper)]
  end
end

return M
