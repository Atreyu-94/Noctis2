import lux from './variants/lux.js';
import hibernus from './variants/hibernus.js';
import lilac from './variants/lilac.js';
import noctis from './variants/noctis.js';
import azureus from './variants/azureus.js';
import bordo from './variants/bordo.js';
import obscuro from './variants/obscuro.js';
import sereno from './variants/sereno.js';
import uva from './variants/uva.js';
import viola from './variants/viola.js';
import minimus from './variants/minimus.js';
import { resolveSyntax } from './roles.js';
import type { Variant, ThemeId } from './types.js';
export type { Color, Palette, Style, ThemeId, UiRole, Variant } from './types.js';
export { resolveSyntax } from './roles.js';
export { composite, rgba } from './color.js';

export const contractVersion = 1;
const variants = { lux, hibernus, lilac, noctis, azureus, bordo, obscuro, sereno, uva, viola, minimus } satisfies Record<ThemeId, Variant>;
export const variantIds: readonly ThemeId[] = Object.freeze(Object.keys(variants) as ThemeId[]);
export function getTheme(id: string) {
   if (!Object.hasOwn(variants, id)) throw new Error(`Unknown Noctis2 variant: ${id}`);
   const variant: Variant = structuredClone(variants[id as ThemeId]);
   return { ...variant, syntax: resolveSyntax(variant.palette) };
}
export type CoreTheme = ReturnType<typeof getTheme>;
export function listVariants() { return variantIds.map(id => { const v = variants[id]; return { id, name: v.name, appearance: v.appearance }; }); }
