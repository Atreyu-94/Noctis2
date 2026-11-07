import { mkdir, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import { getTheme, variantIds } from '../../../core/src/index.js';
import type { CoreTheme, Style } from '../../../core/src/index.js';

function style(value: Style) {
   // Zed's theme schema has no underline/strike fields. Do not emit ignored keys.
   return {
      ...(value.foreground === undefined ? {} : { color: value.foreground }),
      ...(value.bold === undefined ? {} : { font_weight: value.bold ? 700 : 400 }),
      ...(value.italic === undefined ? {} : { font_style: value.italic ? 'italic' : 'normal' }),
   };
}

export function renderTheme(t: CoreTheme) {
   const u = t.ui, s = t.syntax;
   const syntax = {
      text: s.text, comment: s.comment, 'comment.doc': s.comment,
      keyword: s.keyword, operator: s.operator, variable: s.variable,
      'variable.parameter': s.parameter, 'variable.special': s.variable,
      property: s.property, type: s.type, 'type.builtin': s.type, 'type.class': s.type,
      'type.interface': s.type, 'type.struct': s.type, 'type.enum': s.type,
      'type.parameter': s.type, 'type.enum.member': s.constant, enum: s.type,
      constant: s.constant, 'constant.builtin': s.constant, variant: s.constant,
      function: s.function, 'function.method': s.method, 'function.definition': s.functionDeclaration,
      'function.macro': s.macro,
      'function.method.definition': s.methodDeclaration, constructor: s.type,
      namespace: s.namespace, attribute: s.attribute, tag: s.tag, 'tag.attribute': s.attribute,
      string: s.string, 'string.escape': s.escape, 'string.regex': s.regexp,
      'string.special': s.interpolation, 'string.special.symbol': s.constant,
      number: s.number, boolean: s.boolean, preproc: s.macro,
      punctuation: s.punctuation, 'punctuation.bracket': s.punctuation,
      'punctuation.delimiter': s.punctuation, 'punctuation.special': s.escape,
      'punctuation.list_marker': s.keyword, title: s.heading,
      'text.literal': s.raw, label: s.label, link_text: s.reference, link_uri: s.link,
      emphasis: s.emphasis, 'emphasis.strong': s.strong, embedded: s.text,
   };
   const terminal = Object.fromEntries(
      ['black', 'red', 'green', 'yellow', 'blue', 'magenta', 'cyan', 'white'].flatMap(name => {
         const normal = `terminal.${name}` as keyof typeof u;
         const bright = `terminal.bright${name[0]!.toUpperCase()}${name.slice(1)}` as keyof typeof u;
         return [[`terminal.ansi.${name}`, u[normal]], [`terminal.ansi.bright_${name}`, u[bright]]];
      }),
   );
   return { name: t.name, appearance: t.appearance, style: {
      background: u['surface.editor'], 'surface.background': u['surface.panel'],
      'elevated_surface.background': u['surface.popup'],
      border: u['border.default'], 'border.variant': u['border.default'],
      'border.focused': u['border.focus'], 'border.selected': u['border.focus'],
      text: u['text.interface'], 'text.muted': u['text.description'],
      'text.disabled': u['text.inactiveTab'], 'text.placeholder': u['text.description'],
      icon: u['text.interface'], 'icon.muted': u['text.description'],
      'element.background': u['surface.input'], 'element.hover': u['selection.listInactive'],
      'element.active': u['selection.listActive'], 'element.selected': u['selection.listActive'],
      'ghost_element.hover': u['selection.listInactive'], 'ghost_element.selected': u['selection.listActive'],
      'status_bar.background': u['surface.status'], 'title_bar.background': u['surface.title'],
      'toolbar.background': u['surface.editor'], 'tab_bar.background': u['surface.panel'],
      'tab.active_background': u['surface.editor'], 'tab.inactive_background': u['surface.panel'],
      'panel.background': u['surface.sidebar'], 'pane_group.border': u['border.default'],
      'editor.background': u['surface.editor'], 'editor.foreground': u['text.editor'],
      'editor.gutter.background': u['surface.editor'], 'editor.line_number': u['lineNumber.normal'],
      'editor.active_line_number': u['lineNumber.active'], 'editor.active_line.background': u['line.active'],
      'editor.invisible': u['lineNumber.normal'], 'editor.indent_guide': u['lineNumber.normal'],
      'search.match_background': u['search.match'],
      'terminal.background': u['terminal.background'], 'terminal.foreground': u['terminal.foreground'],
      ...terminal,
      error: u['diagnostic.error'], warning: u['diagnostic.warning'], info: u['diagnostic.info'],
      hint: u['diagnostic.info'], success: u['git.added'],
      created: u['git.added'], modified: u['git.modified'], deleted: u['git.deleted'],
      conflict: u['git.conflict'], ignored: u['git.ignored'],
      players: [{ cursor: u['cursor.primary'], background: u['cursor.primary'], selection: u['selection.editor'] }],
      syntax: Object.fromEntries(Object.entries(syntax).map(([key, value]) => [key, style(value)])),
   } };
}

export function renderFamily() {
   return { $schema: 'https://zed.dev/schema/themes/v0.2.0.json', name: 'Noctis2', author: 'Atreyu-94',
      themes: variantIds.map(id => renderTheme(getTheme(id))) };
}

export async function build(root: string): Promise<void> {
   await mkdir(join(root, 'themes'), { recursive: true });
   await writeFile(join(root, 'themes/noctis2.json'), JSON.stringify(renderFamily(), null, 2) + '\n');
}
