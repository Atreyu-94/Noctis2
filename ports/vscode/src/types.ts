import type { Color } from '../../../core/src/types.js';
export type { Color, Palette, ThemeId } from '../../../core/src/types.js';
export interface TokenRule {
   name: string;
   scope: string | string[];
   settings: { foreground?: Color; fontStyle?: string };
}
export interface Theme {
   name: string;
   type: 'dark' | 'light';
   colors: Record<string, Color>;
   tokenColors: TokenRule[];
}
export type ThemeFactory = (syntax: TokenRule[]) => Theme;

export interface SemanticStyle {
   foreground?: Color;
   bold?: boolean;
   italic?: boolean;
   underline?: boolean;
}
export type SemanticRules = Record<string, Color | SemanticStyle>;
