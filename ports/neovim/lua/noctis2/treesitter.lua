local M = {}
function M.groups()
  local mapping = {
    variable = 'variable', ['variable.builtin'] = 'variable', ['variable.parameter'] = 'parameter', ['variable.member'] = 'property',
    constant = 'constant', ['constant.builtin'] = 'constant', ['constant.macro'] = 'macro', module = 'namespace', label = 'label',
    string = 'string', ['string.documentation'] = 'string', ['string.regexp'] = 'regexp', ['string.escape'] = 'escape', ['string.special'] = 'interpolation', ['string.special.url'] = 'link',
    boolean = 'boolean', number = 'number', ['number.float'] = 'number', type = 'type', ['type.builtin'] = 'type', ['type.definition'] = 'type', attribute = 'attribute', property = 'property',
    ['function'] = 'function', ['function.builtin'] = 'function', ['function.call'] = 'function', ['function.method'] = 'method', ['function.method.call'] = 'method', ['function.macro'] = 'macro', constructor = 'type',
    operator = 'operator', keyword = 'keyword', ['keyword.function'] = 'keyword', ['keyword.operator'] = 'operator', ['keyword.return'] = 'keyword', ['keyword.import'] = 'keyword',
    ['punctuation.delimiter'] = 'punctuation', ['punctuation.bracket'] = 'punctuation', ['punctuation.special'] = 'escape',
    comment = 'comment', ['comment.documentation'] = 'comment', ['comment.error'] = 'invalid', ['comment.todo'] = 'heading',
    ['markup.strong'] = 'strong', ['markup.italic'] = 'emphasis', ['markup.strikethrough'] = 'strike', ['markup.heading'] = 'heading',
    ['markup.link'] = 'reference', ['markup.link.label'] = 'reference', ['markup.link.url'] = 'link', ['markup.raw'] = 'raw', ['markup.math'] = 'mathText',
    ['markup.list'] = 'keyword', tag = 'tag', ['tag.builtin'] = 'tag', ['tag.attribute'] = 'attribute', ['tag.delimiter'] = 'punctuation',
  }
  local groups = {}
  for name, role in pairs(mapping) do groups['@' .. name] = { link = 'Noctis2_' .. role } end
  return groups
end
return M
