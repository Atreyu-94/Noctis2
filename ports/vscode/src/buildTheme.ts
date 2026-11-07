import { createSemanticColors } from './createSemanticColors.js';
import { createLanguageSyntax } from './createLanguageSyntax.js';
import { writeFile } from 'node:fs/promises';
import { createSyntax } from './createSyntax.js';
import type { Palette, ThemeFactory, ThemeId } from './types.js';

export async function buildTheme(path: string, palette: Palette, factory: ThemeFactory, name: ThemeId): Promise<void> {
   const base = factory([...createSyntax(palette), ...createLanguageSyntax(palette)]);
   const theme = { ...base, semanticHighlighting: true, semanticTokenColors: createSemanticColors(palette) };
   await writeFile(path, JSON.stringify(theme, null, 3));
   console.log(`Built ${name}`);
}
