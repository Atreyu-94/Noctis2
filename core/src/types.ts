export type ThemeId = "lux"
   | "hibernus"
   | "lilac"
   | "noctis"
   | "azureus"
   | "bordo"
   | "obscuro"
   | "sereno"
   | "uva"
   | "viola"
   | "minimus";
export type Color = `#${string}`;
export type PaletteKey = "comment"
   | "text"
   | "keyword"
   | "variable"
   | "annotation"
   | "constant"
   | "tag"
   | "string"
   | "stringInterpolated"
   | "number"
   | "function"
   | "support"
   | "misc"
   | "invalid";
export type Palette = Readonly<Record<PaletteKey, Color>>;
export type UiRole = "surface.editor"
   | "surface.sidebar"
   | "surface.panel"
   | "surface.popup"
   | "surface.status"
   | "surface.title"
   | "surface.input"
   | "text.editor"
   | "text.interface"
   | "text.description"
   | "text.sidebar"
   | "text.inactiveTab"
   | "border.default"
   | "border.focus"
   | "cursor.primary"
   | "lineNumber.normal"
   | "lineNumber.active"
   | "selection.editor"
   | "selection.interface"
   | "selection.listActive"
   | "selection.listActiveText"
   | "selection.listInactive"
   | "search.match"
   | "search.otherMatch"
   | "line.active"
   | "diagnostic.error"
   | "diagnostic.warning"
   | "diagnostic.info"
   | "git.added"
   | "git.modified"
   | "git.deleted"
   | "git.untracked"
   | "git.ignored"
   | "git.conflict"
   | "diff.insertedBackground"
   | "diff.deletedBackground"
   | "terminal.background"
   | "terminal.foreground"
   | "terminal.black"
   | "terminal.red"
   | "terminal.green"
   | "terminal.yellow"
   | "terminal.blue"
   | "terminal.magenta"
   | "terminal.cyan"
   | "terminal.white"
   | "terminal.brightBlack"
   | "terminal.brightRed"
   | "terminal.brightGreen"
   | "terminal.brightYellow"
   | "terminal.brightBlue"
   | "terminal.brightMagenta"
   | "terminal.brightCyan"
   | "terminal.brightWhite";
export interface Style {
   readonly foreground?: Color;
   readonly bold?: boolean;
   readonly italic?: boolean;
   readonly underline?: boolean;
   readonly strikethrough?: boolean;
}
export interface Variant {
   readonly id: ThemeId;
   readonly name: string;
   readonly appearance: 'light' | 'dark';
   readonly palette: Palette;
   readonly ui: Readonly<Record<UiRole, Color>>;
}
