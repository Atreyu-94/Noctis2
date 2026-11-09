// Zed themes cannot install settings. This explicit settings fragment uses style
// names instead of palette literals, so it follows all eleven theme variants.
export function renderSemanticSettings() {
   const rules: Record<string, unknown>[] = [
      { token_type: 'jetls.unspecified' },
      { token_modifiers: ['strong'], font_weight: 'bold' },
      { token_modifiers: ['emph'], font_style: 'italic' },
      { token_modifiers: ['deprecated'], strikethrough: true },
      ...['variable', 'property'].map(token_type => ({ token_type, token_modifiers: ['readonly'], style: ['constant'] })),
      { token_type: 'function', token_modifiers: ['declaration'], style: ['function.definition'] },
      { token_type: 'method', token_modifiers: ['declaration'], style: ['function.method.definition'] },
      ...Object.entries({ text: 'noctis2.math.text', delim: 'noctis2.math.text', punct: 'noctis2.math.punctuation', operator: 'operator' })
         .map(([token_type, name]) => ({ token_type, token_modifiers: ['math'], style: [name] })),
      ...Object.entries({
         decorator: 'function.macro', record: 'type', recordClass: 'type', recordStruct: 'type',
         selfParameter: 'variable.parameter', tomlArrayKey: 'variable', tomlTableKey: 'variable',
         regexp: 'string.regex', bool: 'boolean', punct: 'punctuation', escape: 'string.escape',
         link: 'link_uri', raw: 'text.literal', label: 'label', ref: 'link_text', heading: 'title',
         marker: 'keyword', term: 'noctis2.term', delim: 'punctuation', pol: 'variable', error: 'noctis2.invalid',
      }).map(([token_type, name]) => ({ token_type, style: [name] })),
   ];
   return { semantic_tokens: 'combined', global_lsp_settings: { semantic_token_rules: rules } };
}
