-- Run in a clean Neovim process; never installs into the user's runtimepath.
local root = vim.fn.getcwd()
local function json(path) return vim.json.decode(table.concat(vim.fn.readfile(path), '\n')) end
local inputs = json(root .. '/test-results/native-languages/inputs.json')
local catalog = json(root .. '/tests/samples/catalog.json')
local expectations = json(root .. '/ports/neovim/tests/languages.json')
vim.opt.runtimepath:prepend(root .. '/test-results/native-languages/neovim')
vim.opt.runtimepath:prepend(root .. '/ports/neovim')
for name, source in pairs(inputs.neovim) do
  vim.treesitter.language.add(name, { path = source.library })
end
local variants = require('noctis2.generated.variants')
local report = { engine = 'neovim-native-treesitter', version = vim.version(), lockSha256 = inputs.lockSha256, results = {} }
local resolved_probes = {}

local function position(lines, probe)
  local rows = {}
  for i, line in ipairs(lines) do if line == probe.line then rows[#rows + 1] = i end end
  assert(#rows == 1, 'Missing or ambiguous anchor: ' .. probe.line)
  local col = assert(probe.line:find(probe.token, 1, true), probe.token)
  return rows[1] - 1, col - 1
end

for language, sample in pairs(catalog) do
  local filetype = language == 'tsx' and 'typescriptreact' or language
  vim.cmd.edit(vim.fn.fnameescape(root .. '/tests/samples/languages/' .. sample.file))
  local buf = vim.api.nvim_get_current_buf()
  vim.bo[buf].filetype = filetype
  vim.treesitter.start(buf, language)
  local parser = vim.treesitter.get_parser(buf, language)
  parser:parse(true) -- Include embedded languages, including Markdown fences.
  local lines = vim.api.nvim_buf_get_lines(buf, 0, -1, false)
  for _, probe in ipairs(expectations[language]) do
    local row, col = position(lines, probe)
    local captures = vim.treesitter.get_captures_at_pos(buf, row, col)
    local found
    for _, capture in ipairs(captures) do if capture.capture == probe.capture then found = capture end end
    assert(found, language .. '/' .. probe.id .. ': expected ' .. probe.capture .. ', got ' .. vim.inspect(captures))
    resolved_probes[#resolved_probes + 1] = { language = language, probe = probe, found = found, captures = captures }
  end
  vim.treesitter.stop(buf)
  vim.api.nvim_buf_delete(buf, { force = true })
end
for id in pairs(variants) do
  require('noctis2').load(id)
  for _, item in ipairs(resolved_probes) do
    local language, probe, found = item.language, item.probe, item.found
    local theme = require('noctis2.generated.' .. id)
    local group = '@' .. found.capture .. '.' .. found.lang
    local hl_id = vim.api.nvim_get_hl_id_by_name(group)
    -- Neovim resolves language-specific capture fallback through synIDtrans.
    local resolved = vim.fn.synIDtrans(hl_id)
    local actual = vim.api.nvim_get_hl(0, { id = resolved, link = false })
    local expected = theme.syntax[probe.role]
    if expected.fg then assert(actual.fg == tonumber(expected.fg:sub(2), 16), id .. '/' .. language .. '/' .. probe.id .. ': foreground') end
    for _, style in ipairs({ 'bold', 'italic', 'underline', 'strikethrough' }) do
      if expected[style] ~= nil then assert(actual[style] == expected[style], group .. ': ' .. style) end
    end
    report.results[#report.results + 1] = { language = language, variant = id, probe = probe.id,
      capture = found.capture, parser = found.lang, group = group, style = actual }
  end
end
vim.fn.writefile({ vim.json.encode(report) }, root .. '/test-results/neovim-language-validation.json')
print('Neovim: ' .. #report.results .. ' native grammar/style checks')
