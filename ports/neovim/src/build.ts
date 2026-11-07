import { mkdir, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import { getTheme, variantIds, composite } from '../../../core/src/index.js';
import type { Style } from '../../../core/src/index.js';

function lua(value: unknown, depth = 0): string {
   if (value === null || value === undefined) return 'nil';
   if (typeof value === 'string') return JSON.stringify(value);
   if (typeof value === 'number' || typeof value === 'boolean') return String(value);
   if (typeof value !== 'object' || Array.isArray(value)) throw new Error('Expected a Lua data table');
   const pad = '  '.repeat(depth + 1);
   return `{\n${Object.entries(value).map(([key, v]) => `${pad}[${JSON.stringify(key)}] = ${lua(v, depth + 1)},`).join('\n')}\n${'  '.repeat(depth)}}`;
}

export function renderData(id: string) {
   const t = getTheme(id), u = t.ui;
   const syntax = Object.fromEntries(Object.entries(t.syntax).map(([role, value]) => {
      const { foreground, ...attributes }: Style = value;
      return [role, { ...attributes, ...(foreground ? { fg: composite(foreground, u['surface.editor']) } : {}) }];
   }));
   return { id: t.id, name: t.name, appearance: t.appearance, syntax,
      popupSelection: composite(u['selection.listActive'], u['surface.popup']),
      popupBorder: composite(u['border.default'], u['surface.popup']),
      ui: Object.fromEntries(Object.entries(u).map(([role, value]) => {
         const background = role.startsWith('terminal.') ? u['terminal.background']
            : role.startsWith('selection.list') || role === 'text.sidebar' ? u['surface.sidebar']
            : u['surface.editor'];
         return [role, composite(value, background)];
      })),
   };
}

export async function build(root: string): Promise<void> {
   await mkdir(join(root, 'lua/noctis2/generated'), { recursive: true });
   await mkdir(join(root, 'colors'), { recursive: true });
   for (const id of variantIds) {
      await writeFile(join(root, `lua/noctis2/generated/${id}.lua`), '-- Generated from core. Do not edit.\nreturn ' + lua(renderData(id)) + '\n');
      await writeFile(join(root, `colors/noctis2-${id}.lua`), `-- Generated entry point.\nrequire('noctis2').load('${id}')\n`);
   }
   await writeFile(join(root, 'colors/noctis2.lua'), "-- Generated entry point.\nrequire('noctis2').load()\n");
   await writeFile(join(root, 'lua/noctis2/generated/variants.lua'), '-- Generated variant registry.\nreturn ' + lua(Object.fromEntries(variantIds.map(id => [id, getTheme(id).appearance]))) + '\n');
}
