local M = {}
function M.groups(t)
  local groups = {}
  for role, value in pairs(t.syntax) do groups['Noctis2_' .. role] = vim.deepcopy(value) end
  local mapping = {
    Comment = 'comment', Constant = 'constant', String = 'string', Character = 'string', Number = 'number', Boolean = 'boolean', Float = 'number',
    Identifier = 'variable', Function = 'function', Statement = 'keyword', Conditional = 'keyword', Repeat = 'keyword', Label = 'label',
    Operator = 'operator', Keyword = 'keyword', Exception = 'keyword', PreProc = 'macro', Include = 'keyword', Define = 'macro', Macro = 'macro', PreCondit = 'macro',
    Type = 'type', StorageClass = 'keyword', Structure = 'type', Typedef = 'type', Special = 'escape', SpecialChar = 'escape', Tag = 'tag',
    Delimiter = 'punctuation', SpecialComment = 'comment', Debug = 'macro', Underlined = 'link', Ignore = 'comment', Error = 'invalid', Todo = 'heading',
  }
  for name, role in pairs(mapping) do groups[name] = { link = 'Noctis2_' .. role } end
  return groups
end
return M
