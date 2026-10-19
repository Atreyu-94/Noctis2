import { createSemanticColors } from './createSemanticColors.js';
import { writeFile } from 'node:fs/promises';
import { createSyntax } from './createSyntax.js';
import type { Palette, ThemeFactory, ThemeId } from './types.js';

export async function buildTheme(path: string, palette: Palette, factory: ThemeFactory, name: ThemeId): Promise<void> {
   const theme = { ...factory(createSyntax(palette)), semanticHighlighting: true, semanticTokenColors: createSemanticColors(palette) };
   await writeFile(path, JSON.stringify(theme, null, 3));
   console.log(`Built ${name}`);
}
