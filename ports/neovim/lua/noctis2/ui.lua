local M = {}
function M.groups(t, opts)
  local u = t.ui
  local bg = opts.transparent and 'NONE' or u['surface.editor']
  local popup = opts.transparent and 'NONE' or u['surface.popup']
  local groups = {
    Normal = { fg = u['text.editor'], bg = bg }, NormalNC = { fg = u['text.editor'], bg = bg },
    NormalFloat = { fg = u['text.interface'], bg = popup },
    FloatBorder = { fg = t.popupBorder, bg = popup }, FloatTitle = { fg = u['text.interface'], bg = popup },
    WinSeparator = { fg = u['border.default'] },
    Cursor = { fg = u['surface.editor'], bg = u['cursor.primary'] },
    LineNr = { fg = u['lineNumber.normal'] }, CursorLineNr = { fg = u['lineNumber.active'] },
    CursorLine = { bg = u['line.active'] }, CursorColumn = { bg = u['line.active'] },
    ColorColumn = { bg = u['surface.panel'] },
    SignColumn = { bg = bg }, FoldColumn = { fg = u['lineNumber.normal'], bg = bg },
    Folded = { fg = u['text.description'], bg = u['surface.panel'] },
    Visual = { bg = u['selection.editor'] }, VisualNOS = { link = 'Visual' },
    Search = { bg = u['search.otherMatch'] }, IncSearch = { bg = u['search.match'] }, CurSearch = { link = 'IncSearch' },
    MatchParen = { fg = u['cursor.primary'], bg = u['selection.editor'] },
    Pmenu = { fg = u['text.interface'], bg = popup },
    PmenuSel = { fg = u['selection.listActiveText'], bg = t.popupSelection },
    PmenuSbar = { bg = u['surface.panel'] }, PmenuThumb = { bg = u['border.focus'] },
    StatusLine = { fg = u['text.interface'], bg = u['surface.status'] },
    StatusLineNC = { fg = u['text.inactiveTab'], bg = u['surface.status'] },
    WinBar = { fg = u['text.interface'], bg = bg }, WinBarNC = { fg = u['text.inactiveTab'], bg = bg },
    TabLine = { fg = u['text.inactiveTab'], bg = u['surface.panel'] },
    TabLineSel = { fg = u['text.interface'], bg = bg }, TabLineFill = { bg = u['surface.panel'] },
    NonText = { fg = u['lineNumber.normal'] }, Whitespace = { link = 'NonText' }, EndOfBuffer = { link = 'NonText' },
    Directory = { fg = t.syntax['function'].fg }, Title = t.syntax.heading,
    ErrorMsg = { fg = u['diagnostic.error'] }, WarningMsg = { fg = u['diagnostic.warning'] },
    ModeMsg = { fg = u['text.interface'] }, MoreMsg = { fg = u['diagnostic.info'] }, Question = { link = 'MoreMsg' },
    DiffAdd = { bg = u['diff.insertedBackground'] }, DiffDelete = { bg = u['diff.deletedBackground'] },
    DiffChange = { bg = u['selection.editor'] }, DiffText = { bg = u['search.match'] },
    Added = { fg = u['git.added'] }, Changed = { fg = u['git.modified'] }, Removed = { fg = u['git.deleted'] },
    LspReferenceText = { bg = u['selection.editor'] }, LspReferenceRead = { link = 'LspReferenceText' },
    LspReferenceWrite = { link = 'LspReferenceText' }, LspInlayHint = { fg = u['text.description'] },
    SpellBad = { sp = u['diagnostic.error'], undercurl = true },
    SpellCap = { sp = u['diagnostic.warning'], undercurl = true },
    SpellLocal = { sp = u['diagnostic.info'], undercurl = true }, SpellRare = { link = 'SpellLocal' },
  }
  for name, role in pairs({ Error = 'error', Warn = 'warning', Info = 'info', Hint = 'info', Ok = 'info' }) do
    local color = name == 'Ok' and u['git.added'] or u['diagnostic.' .. role]
    groups['Diagnostic' .. name] = { fg = color }
    groups['DiagnosticUnderline' .. name] = { sp = color, undercurl = true }
    for _, kind in ipairs({ 'Sign', 'Floating', 'VirtualText', 'VirtualLines' }) do
      groups['Diagnostic' .. kind .. name] = { link = 'Diagnostic' .. name }
    end
  end
  return groups
end
return M
