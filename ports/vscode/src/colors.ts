import { getTheme, variantIds } from '../../../core/src/index.js';
import type { Palette, ThemeId } from '../../../core/src/index.js';
// Native TextMate palette view; core owns the values.
export default Object.fromEntries(variantIds.map(id => [id, getTheme(id).palette])) as Record<ThemeId, Palette>;
