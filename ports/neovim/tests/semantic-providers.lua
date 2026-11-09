local config = vim.json.decode(table.concat(vim.fn.readfile(assert(vim.env.NOCTIS2_NATIVE_CONFIG)), '\n'))
vim.opt.runtimepath:prepend(config.root .. '/ports/neovim')
vim.opt.swapfile = false
vim.opt.shadafile = 'NONE'
vim.cmd.edit(vim.fn.fnameescape(config.file))
vim.bo.filetype = config.filetype
local buf = vim.api.nvim_get_current_buf()
local report = { editor = 'neovim', version = vim.version(), case = config.case, runId = config.runId,
  sampleSha256 = config.sampleSha256, variants = {}, findings = {} }
local client
local function collect()
  -- Neovim explicitly exports this state for tests. Pin the runtime below.
  -- Waiting for it avoids accepting the initial viewport-only range response.
  local highlighter = vim.lsp.semantic_tokens.__STHighlighter.active[buf]
  local state = client and highlighter and highlighter.client_state[client.id]
  if not state or not state.has_full_result then return {} end
  local tokens = {}
  for _, token in ipairs(state.current_result.highlights or {}) do
    local t = vim.deepcopy(token)
    t.text = table.concat(vim.api.nvim_buf_get_text(buf, t.line, t.start_col, t.end_line, t.end_col, {}), '\n')
    tokens[#tokens + 1] = t
  end
  return tokens
end
local ok, error_message = xpcall(function()
  local version = vim.version()
  assert(version.major == 0 and version.minor == 12 and version.patch == 6, 'Native semantic test state is pinned to Neovim 0.12.6')
  local inputs = vim.json.decode(table.concat(vim.fn.readfile(config.root .. '/test-results/native-languages/inputs.json'), '\n'))
  local language = config.sample or config.case
  if inputs.neovim[language] then
    vim.opt.runtimepath:prepend(config.root .. '/test-results/native-languages/neovim')
    for name, source in pairs(inputs.neovim) do vim.treesitter.language.add(name, { path = source.library }) end
    vim.treesitter.start(buf, language)
    vim.treesitter.get_parser(buf, language):parse(true)
    report.syntacticBase = 'native-treesitter'
  else report.syntacticBase = 'not-configured' end
  local id = assert(vim.lsp.start({ name = 'noctis2-' .. config.case,
    cmd = { assert(vim.env.NOCTIS2_NODE), config.root .. '/tooling/semantic-lsp-proxy.mjs', vim.env.NOCTIS2_NATIVE_CONFIG },
    root_dir = config.workspace, init_options = config.initOptions, settings = config.settings,
    handlers = { ['window/showMessageRequest'] = function(_, params)
      -- Import only this disposable Scala fixture; never block headless tests on UI.
      if config.case == 'scala' then
        for _, action in ipairs(params.actions or {}) do
          if action.title == 'Import build' then return action end
        end
      end
      return vim.NIL
    end },
    on_init = function(c) client = c end,
  }))
  local last_refresh = vim.uv.now()
  assert(vim.wait(config.timeoutMs, function()
    if not vim.lsp.get_client_by_id(id) then return true end
    if client and client.initialized then
      -- Neovim advertises no dynamic semantic registration in this clean client.
      if not client.server_capabilities.semanticTokensProvider then return true end
      if client.server_capabilities.semanticTokensProvider then
        if #collect() > 0 then return true end
        -- Project servers can reject the first request while loading dependencies.
        -- Retry through the real native client; preserve every response in the trace.
        if vim.uv.now() - last_refresh > 5000 then
          last_refresh = vim.uv.now()
          report.refreshRequests = (report.refreshRequests or 0) + 1
          vim.lsp.semantic_tokens.force_refresh(buf)
        end
        return false
      end
    end
    return false
  end, 250), 'Native client did not receive semantic tokens before deadline')
  if client then report.serverInfo = client.server_info; report.capability = client.server_capabilities.semanticTokensProvider end
  assert(not client or client.server_capabilities.semanticTokensProvider, 'Server advertises no semantic token capability to native Neovim')
  assert(client and client.initialized and #collect() > 0, 'Native server stopped before returning tokens; inspect lsp.jsonl.stderr')
  report.tokens = collect()
  report.serverInfo = client.server_info
  report.capability = client.server_capabilities.semanticTokensProvider
  report.clientId = id
  for variant in pairs(require('noctis2.generated.variants')) do
    require('noctis2').load(variant)
    local results = {}
    for _, token in ipairs(report.tokens) do
      vim.api.nvim_win_set_cursor(0, { token.line + 1, token.start_col })
      vim.cmd.redraw()
      local inspection = vim.inspect_pos(buf, token.line, token.start_col, { syntax = false, treesitter = false, semantic_tokens = true, extmarks = false })
      local groups = {}
      for _, mark in ipairs(inspection.semantic_tokens or {}) do
        local name = assert(mark.opts.hl_group)
        groups[#groups + 1] = { group = name, resolved = mark.opts.hl_group_link, priority = mark.opts.priority,
          style = vim.api.nvim_get_hl(0, { name = mark.opts.hl_group_link or name, link = false }) }
      end
      local syntax_groups = {}
      if report.syntacticBase == 'native-treesitter' then
        for _, capture in ipairs(vim.treesitter.get_captures_at_pos(buf, token.line, token.start_col)) do
          local name = '@' .. capture.capture .. '.' .. capture.lang
          local resolved = vim.fn.synIDtrans(vim.api.nvim_get_hl_id_by_name(name))
          syntax_groups[#syntax_groups + 1] = { group = name, priority = capture.metadata.priority or 100,
            style = vim.api.nvim_get_hl(0, { id = resolved, link = false }) }
        end
      end
      results[#results + 1] = { text = token.text, type = token.type, modifiers = token.modifiers, groups = groups, syntaxGroups = syntax_groups }
    end
    report.variants[variant] = results
  end
  report.status = 'captured'
end, debug.traceback)
if not ok then report.status = 'failed'; report.error = error_message end
if client then client:stop(); vim.wait(3000, function() return client:is_stopped() end, 50) end
vim.fn.writefile({ vim.json.encode(report) }, config.output .. '/capture.json')
print(config.case .. ': ' .. report.status .. ', ' .. #(report.tokens or {}) .. ' native tokens')
if not ok then error(error_message) end
