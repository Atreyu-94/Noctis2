import type { Palette, TokenRule } from './types.js';

/** Narrow TextMate fallbacks for the language grammars, also usable without a server. */
export function createLanguageSyntax(p: Palette): TokenRule[] {
   return [
      { name: 'Julia interpolation', scope: ['variable.interpolation.julia'], settings: { foreground: p.stringInterpolated } },
      { name: 'Typst text', scope: ['source.typst', 'source.typst-code'], settings: { foreground: p.text } },
      { name: 'Typst headings', scope: ['markup.heading.typst'], settings: { foreground: p.misc, fontStyle: 'bold' } },
      { name: 'Typst labels', scope: ['string.other.label.typst'], settings: { foreground: p.constant } },
      { name: 'Typst references', scope: ['string.other.reference.typst', 'markup.other.reference.typst'], settings: { foreground: p.misc } },
      { name: 'Typst raw', scope: ['markup.raw.inline.typst', 'markup.raw.block.typst', 'markup.other.raw.typst'], settings: { foreground: p.string } },
      { name: 'Typst emphasis', scope: ['markup.italic.typst'], settings: { fontStyle: 'italic' } },
      { name: 'Typst strong', scope: ['markup.bold.typst'], settings: { fontStyle: 'bold' } },
      { name: 'Typst strong emphasis', scope: ['markup.bold.typst markup.italic.typst', 'markup.italic.typst markup.bold.typst'], settings: { fontStyle: 'bold italic' } },
   ];
}
