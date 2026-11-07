import type { ThemeFactory, ThemeId } from './types.js';
import lux from "./workbench/lux.js";
import hibernus from "./workbench/hibernus.js";
import lilac from "./workbench/lilac.js";
import noctis from "./workbench/noctis.js";
import azureus from "./workbench/azureus.js";
import obscuro from "./workbench/obscuro.js";
import sereno from "./workbench/sereno.js";
import minimus from "./workbench/minimus.js";
import bordo from "./workbench/bordo.js";
import uva from "./workbench/uva.js";
import viola from "./workbench/viola.js";
import { buildAllThemes } from "./buildAllThemes.js";

export const THEMES = { lux, hibernus, lilac, noctis, azureus, obscuro, sereno, minimus, bordo, uva, viola } satisfies Record<ThemeId, ThemeFactory>;

export async function build(directory: string): Promise<void> { await buildAllThemes(THEMES, directory); }
