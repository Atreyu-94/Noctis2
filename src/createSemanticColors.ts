import type { Palette, SemanticRules } from './types.js';

/** Colors come exclusively from the selected variant; TextMate remains the fallback. */
export function createSemanticColors(p: Palette): SemanticRules {
   const rules: SemanticRules = {
      namespace: p.annotation, type: p.annotation, class: p.annotation,
      interface: p.annotation, struct: p.annotation, enum: p.annotation,
      typeParameter: p.annotation, parameter: p.variable, variable: p.variable,
      property: p.annotation, enumMember: p.constant,
      'variable.readonly': p.constant, 'property.readonly': p.constant,
      function: p.function, method: p.support,
      'function.declaration': p.tag, 'method.declaration': p.tag,
      macro: p.misc, decorator: p.misc,
      comment: p.comment, string: p.string, number: p.number,
      keyword: p.keyword, operator: p.keyword, regexp: p.stringInterpolated,
   };
   // Tinymist uses custom token types. Keep them scoped to its language IDs.
   for (const language of ['typst', 'typst-code']) {
      const custom: SemanticRules = {
         bool: p.number, punct: p.text, escape: p.misc,
         link: { foreground: p.misc, underline: true },
         raw: p.string, label: p.constant, ref: p.misc,
         heading: { foreground: p.misc, bold: true },
         marker: p.keyword, term: { foreground: p.annotation, bold: true },
         delim: p.text, pol: p.variable, error: p.invalid,
         '*.strong': { bold: true }, '*.emph': { italic: true },
         '*.strong.emph': { bold: true, italic: true },
      };
      for (const [selector, value] of Object.entries(custom)) rules[`${selector}:${language}`] = value;
   }
   return rules;
}
