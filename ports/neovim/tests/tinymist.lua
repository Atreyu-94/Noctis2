local root = vim.fn.getcwd()
local executable = assert(vim.env.TINYMIST_BIN, 'Set TINYMIST_BIN to run the real LSP integration')
vim.opt.runtimepath:prepend(root .. '/ports/neovim')
vim.cmd.edit(vim.fn.fnameescape(root .. '/tests/samples/languages/report.typ'))
vim.bo.filetype = 'typst'
local buf = vim.api.nvim_get_current_buf()
local client_id = assert(vim.lsp.start({ name = 'noctis2-tinymist-test', cmd = { executable, 'lsp' },
  root_dir = root .. '/tests/samples/languages', init_options = { semanticTokens = 'enable', exportPdf = 'never' } }))
local lines = vim.api.nvim_buf_get_lines(buf, 0, -1, false)
local probes = {
  { line = '#let enabled = true', text = 'true', type = 'bool', group = '@lsp.type.bool.typst', role = 'boolean' },
  { line = 'See @intro and https://example.org.', text = '@intro', type = 'ref', group = '@lsp.type.ref.typst', role = 'reference' },
  { line = '$ x^2 + frac(1, 2) = alpha $', text = 'x', type = 'text', modifier = 'math', group = '@lsp.typemod.text.math.typst', role = 'mathText' },
  { line = 'Plain text, *strong*, _emphasis_, and *_both_*.', text = 'both', type = 'text', modifier = 'strong', group = '@lsp.mod.strong.typst', role = 'strong' },
}
local report = { engine = 'neovim-native-lsp', results = {} }
for _, probe in ipairs(probes) do
  local row
  for i, line in ipairs(lines) do if line == probe.line then assert(not row); row = i - 1 end end
  assert(row, probe.line)
  local col = assert(probe.line:find(probe.text, 1, true)) - 1
  local token
  assert(vim.wait(20000, function()
    for _, t in ipairs(vim.lsp.semantic_tokens.get_at_pos(buf, row, col) or {}) do
      if t.type == probe.type then token = t; return true end
    end
    return false
  end, 50), 'No semantic token at ' .. probe.text)
  if probe.modifier then assert(token.modifiers[probe.modifier], 'Missing modifier') end
  for id in pairs(require('noctis2.generated.variants')) do
    require('noctis2').load(id)
    local actual = vim.api.nvim_get_hl(0, { name = probe.group, link = false })
    local expected = require('noctis2.generated.' .. id).syntax[probe.role]
    if expected.fg then assert(actual.fg == tonumber(expected.fg:sub(2), 16), id .. '/' .. probe.text) end
    if expected.bold then assert(actual.bold) end
    report.results[#report.results + 1] = { variant = id, token = token, group = probe.group, style = actual }
  end
end
local client = assert(vim.lsp.get_client_by_id(client_id))
report.serverInfo = client.server_info
client:stop()
vim.wait(3000, function() return client:is_stopped() end, 50)
vim.fn.writefile({ vim.json.encode(report) }, root .. '/test-results/neovim-tinymist-validation.json')
print('Neovim/Tinymist: ' .. #report.results .. ' native semantic-token/style checks')
