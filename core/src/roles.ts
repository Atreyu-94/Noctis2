import type { Palette, Style } from './types.js';

/** Visual intent shared by every port; native capture names belong to the port. */
export function resolveSyntax(p: Palette) {
   return {
      text: { foreground: p.text }, comment: { foreground: p.comment },
      keyword: { foreground: p.keyword }, operator: { foreground: p.keyword },
      variable: { foreground: p.variable }, parameter: { foreground: p.variable },
      property: { foreground: p.annotation }, type: { foreground: p.annotation },
      namespace: { foreground: p.annotation }, constant: { foreground: p.constant },
      function: { foreground: p.function }, method: { foreground: p.support },
      functionDeclaration: { foreground: p.tag }, methodDeclaration: { foreground: p.tag },
      tag: { foreground: p.tag }, attribute: { foreground: p.annotation },
      string: { foreground: p.string }, interpolation: { foreground: p.stringInterpolated },
      regexp: { foreground: p.stringInterpolated }, number: { foreground: p.number },
      boolean: { foreground: p.number }, macro: { foreground: p.misc },
      escape: { foreground: p.misc }, punctuation: { foreground: p.text },
      invalid: { foreground: p.invalid },
      heading: { foreground: p.misc, bold: true },
      link: { foreground: p.misc, underline: true },
      label: { foreground: p.constant }, reference: { foreground: p.misc },
      raw: { foreground: p.string }, mathText: { foreground: p.string },
      mathPunctuation: { foreground: p.misc }, term: { foreground: p.annotation, bold: true },
      strong: { bold: true }, emphasis: { italic: true },
      strongEmphasis: { bold: true, italic: true }, strike: { strikethrough: true },
   } satisfies Record<string, Style>;
}
