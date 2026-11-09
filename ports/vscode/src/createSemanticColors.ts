import { resolveSyntax } from '../../../core/src/index.js';
import type { Palette, SemanticRules } from './types.js';

/** Colors come exclusively from the selected variant; TextMate remains the fallback. */
export function createSemanticColors(p: Palette): SemanticRules {
   const s = resolveSyntax(p);
   const rules: SemanticRules = {
      namespace: s.namespace.foreground, type: s.type.foreground, class: s.type.foreground,
      interface: s.type.foreground, struct: s.type.foreground, enum: s.type.foreground,
      typeParameter: s.type.foreground, parameter: s.parameter.foreground, variable: s.variable.foreground,
      property: s.property.foreground, enumMember: s.constant.foreground,
      'variable.readonly': s.constant.foreground, 'property.readonly': s.constant.foreground,
      function: s.function.foreground, method: s.method.foreground,
      'function.declaration': s.functionDeclaration.foreground, 'method.declaration': s.methodDeclaration.foreground,
      macro: s.macro.foreground, decorator: s.macro.foreground,
      comment: s.comment.foreground, string: s.string.foreground, number: s.number.foreground,
      keyword: s.keyword.foreground, operator: s.operator.foreground, regexp: s.regexp.foreground,
      // Pylance's modifier needs an explicit rule: generic string wins over scope fallback.
      'string.escapeCharacter:python': s.escape.foreground,
   };
   // Tinymist uses custom token types. Keep them scoped to its language IDs.
   for (const language of ['typst', 'typst-code']) {
      const custom: SemanticRules = {
         bool: s.boolean.foreground, punct: s.punctuation.foreground, escape: s.escape.foreground,
         link: { ...s.link },
         raw: s.raw.foreground, label: s.label.foreground, ref: s.reference.foreground,
         heading: { ...s.heading },
         marker: s.keyword.foreground, term: { ...s.term },
         delim: s.punctuation.foreground, pol: s.variable.foreground, error: s.invalid.foreground,
         // Math context colors must not replace function, string or embedded-code categories.
         'text.math': s.mathText.foreground, 'delim.math': s.mathText.foreground,
         'operator.math': s.operator.foreground, 'punct.math': s.mathPunctuation.foreground,
         '*.strong': { ...s.strong }, '*.emph': { ...s.emphasis },
         '*.strong.emph': { ...s.strongEmphasis },
      };
      for (const [selector, value] of Object.entries(custom)) rules[`${selector}:${language}`] = value;
   }
   return rules;
}
