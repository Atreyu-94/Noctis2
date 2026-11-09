local M = {}
function M.groups()
  local mapping = {
    namespace = 'namespace', type = 'type', class = 'type', enum = 'type', interface = 'type', struct = 'type', typeParameter = 'type',
    parameter = 'parameter', variable = 'variable', property = 'property', enumMember = 'constant', ['function'] = 'function', method = 'method',
    macro = 'macro', decorator = 'macro', keyword = 'keyword', comment = 'comment', string = 'string', number = 'number', regexp = 'regexp', operator = 'operator',
  }
  local groups = {}
  for name, role in pairs(mapping) do groups['@lsp.type.' .. name] = { link = 'Noctis2_' .. role } end
  for _, name in ipairs({ 'variable', 'property' }) do groups['@lsp.typemod.' .. name .. '.readonly'] = { link = 'Noctis2_constant' } end
  groups['@lsp.typemod.function.declaration'] = { link = 'Noctis2_functionDeclaration' }
  groups['@lsp.typemod.method.declaration'] = { link = 'Noctis2_methodDeclaration' }
  groups['@lsp.mod.deprecated'] = { strikethrough = true }
  -- Provider-specific names stay scoped to their native filetypes.
  groups['@lsp.type.tomlArrayKey.toml'] = { link = 'Noctis2_variable' }
  groups['@lsp.type.tomlTableKey.toml'] = { link = 'Noctis2_variable' }
  groups['@lsp.type.recordClass.cs'] = { link = 'Noctis2_type' }
  groups['@lsp.type.record.java'] = { link = 'Noctis2_type' }
  -- Tinymist's custom token names must not affect other filetypes.
  for token, role in pairs({ bool = 'boolean', punct = 'punctuation', escape = 'escape', link = 'link', raw = 'raw', label = 'label', ref = 'reference', heading = 'heading', marker = 'keyword', term = 'term', delim = 'punctuation', pol = 'variable', error = 'invalid' }) do
    groups['@lsp.type.' .. token .. '.typst'] = { link = 'Noctis2_' .. role }
  end
  for token, role in pairs({ text = 'mathText', delim = 'mathText', operator = 'operator', punct = 'mathPunctuation' }) do
    groups['@lsp.typemod.' .. token .. '.math.typst'] = { link = 'Noctis2_' .. role }
  end
  groups['@lsp.mod.strong.typst'] = { bold = true }
  groups['@lsp.mod.emph.typst'] = { italic = true }
  return groups
end
return M
