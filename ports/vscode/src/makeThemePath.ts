import { join } from 'node:path';
import type { ThemeId } from './types.js';

export function makeThemePath(directory: string, name: ThemeId): string {
   return join(directory, `${name}.json`);
}
