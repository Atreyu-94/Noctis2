import { mkdir } from 'node:fs/promises';
import COLORS from './colors.js';
import { makeThemePath } from './makeThemePath.js';
import { buildTheme } from './buildTheme.js';
import type { ThemeFactory, ThemeId } from './types.js';

export async function buildAllThemes(themes: Record<ThemeId, ThemeFactory>, directory: string): Promise<void> {
   await mkdir(directory, { recursive: true });
   for (const name of Object.keys(themes) as ThemeId[]) {
      await buildTheme(makeThemePath(directory, name), COLORS[name], themes[name], name);
   }
}
