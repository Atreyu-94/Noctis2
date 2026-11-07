import { resolveSyntax } from '../../../core/src/index.js';
import type { Palette, TokenRule } from './types.js';

/** Narrow TextMate fallbacks for the language grammars, also usable without a server. */
export function createLanguageSyntax(p: Palette): TokenRule[] {
   const s = resolveSyntax(p);
   return [
      { name: 'Markdown strong emphasis', scope: ['markup.bold.markdown markup.italic.markdown', 'markup.italic.markdown markup.bold.markdown'], settings: { fontStyle: 'bold italic' } },
      { name: 'Julia interpolation', scope: ['variable.interpolation.julia'], settings: { foreground: s.interpolation.foreground } },
      { name: 'Typst text', scope: ['source.typst', 'source.typst-code'], settings: { foreground: s.text.foreground } },
      { name: 'Typst headings', scope: ['markup.heading.typst'], settings: { foreground: s.heading.foreground, fontStyle: 'bold' } },
      { name: 'Typst labels', scope: ['string.other.label.typst'], settings: { foreground: s.label.foreground } },
      { name: 'Typst references', scope: ['string.other.reference.typst', 'markup.other.reference.typst'], settings: { foreground: s.reference.foreground } },
      { name: 'Typst raw', scope: ['markup.raw.inline.typst', 'markup.raw.block.typst', 'markup.other.raw.typst'], settings: { foreground: s.raw.foreground } },
      { name: 'Typst math text', scope: ['markup.math.typst'], settings: { foreground: s.mathText.foreground } },
      { name: 'Typst math delimiters', scope: ['punctuation.definition.string.begin.math.typst', 'punctuation.definition.string.end.math.typst', 'punctuation.definition.math.typst'], settings: { foreground: s.mathText.foreground } },
      { name: 'Typst math operators', scope: ['punctuation.math.operator.typst', 'keyword.operator.math.typst'], settings: { foreground: s.operator.foreground } },
      { name: 'Typst math punctuation', scope: ['markup.math.typst markup.content.brace.typst', 'markup.math.typst meta.brace.round.typst', 'markup.math.typst punctuation.separator.comma.typst'], settings: { foreground: s.mathPunctuation.foreground } },
      { name: 'Typst emphasis', scope: ['markup.italic.typst'], settings: { fontStyle: 'italic' } },
      { name: 'Typst strong', scope: ['markup.bold.typst'], settings: { fontStyle: 'bold' } },
      { name: 'Typst strong emphasis', scope: ['markup.bold.typst markup.italic.typst', 'markup.italic.typst markup.bold.typst'], settings: { fontStyle: 'bold italic' } },
   ];
}
