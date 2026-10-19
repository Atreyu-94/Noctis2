export type ThemeId = 'lux' | 'hibernus' | 'lilac' | 'noctis' | 'azureus' | 'obscuro' | 'sereno' | 'minimus' | 'bordo' | 'uva' | 'viola';
export type PaletteKey = 'comment' | 'text' | 'keyword' | 'variable' | 'annotation' | 'constant' | 'tag' | 'string' | 'stringInterpolated' | 'number' | 'function' | 'support' | 'misc' | 'invalid';
export type Color = `#${string}`;
export type Palette = Record<PaletteKey, Color>;
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
