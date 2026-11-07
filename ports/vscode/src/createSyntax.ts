import SYNTAX from './syntax.js';
import type { Palette, TokenRule } from './types.js';

export function createSyntax(palette: Palette): TokenRule[] {
   const colors = new Map(Object.entries(palette).map(([key, value]) => [key.toLowerCase(), value]));
   return SYNTAX.map((rule): TokenRule => {
      const foreground = colors.get(rule.name.toLowerCase());
      return {
         ...rule,
         scope: Array.isArray(rule.scope) ? [...rule.scope] : rule.scope,
         settings: { ...rule.settings, ...(foreground === undefined ? {} : { foreground }) },
      };
   });
}
