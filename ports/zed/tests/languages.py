"""Real pinned Zed grammar/query execution, not a Zed GUI or renderer test."""
import ctypes
import json
from pathlib import Path
import re
import sys

ROOT = Path(__file__).resolve().parents[3]
CACHE = ROOT / 'test-results/native-languages'
sys.path.insert(0, str(CACHE / 'python'))
from tree_sitter import Language, Parser, Query, QueryCursor

inputs = json.loads((CACHE / 'inputs.json').read_text(encoding='utf-8'))
catalog = json.loads((ROOT / 'tests/samples/catalog.json').read_text(encoding='utf-8'))
expectations = json.loads((ROOT / 'ports/zed/tests/languages.json').read_text(encoding='utf-8'))
family = json.loads((ROOT / 'ports/zed/themes/noctis2.json').read_text(encoding='utf-8'))
core = json.loads((ROOT / 'dist/data/noctis2.json').read_text(encoding='utf-8'))['variants']
core_by_name = {theme['name']: theme for theme in core}
capsule = ctypes.pythonapi.PyCapsule_New
capsule.restype = ctypes.py_object
capsule.argtypes = [ctypes.c_void_p, ctypes.c_char_p, ctypes.c_void_p]
libraries, languages = {}, {}
for name, spec in inputs['zed'].items():
    libraries[name] = ctypes.CDLL(spec['library'])
    function = getattr(libraries[name], 'tree_sitter_' + name)
    function.restype = ctypes.c_void_p
    languages[name] = Language(capsule(function(), b'tree_sitter.Language', None))


def query(language, kind):
    path = Path(inputs['zed'][language]['queries']) / (kind + '.scm')
    if not path.exists():
        return None
    text = path.read_text(encoding='utf-8')
    # Fail on unhandled predicate families rather than silently ignoring them.
    predicates = set(re.findall(r'\(#([\w.-]+[!?])', text))
    allowed = {'eq?', 'not-eq?', 'match?', 'not-match?', 'any-of?', 'not-any-of?', 'set!',
               'has-parent?', 'not-has-parent?', 'has-ancestor?'}
    assert predicates <= allowed, (path, predicates - allowed)
    return Query(languages[language], text)


def custom_predicate(name, args, pattern, match):
    if name == 'has-ancestor?':
        # Zed 1.27 syntax_map.rs ignores this extension query predicate.
        return True
    assert name in {'has-parent?', 'not-has-parent?'}, name
    nodes = match.get(args[0][0], [])
    found = bool(nodes and nodes[0].parent and nodes[0].parent.type == args[1][0])
    return not found if name == 'not-has-parent?' else found


def captures(language, source, offset=0, depth=0):
    assert depth < 8, 'Recursive injection limit exceeded'
    tree = Parser(languages[language]).parse(source)
    result, gaps = [], []
    highlights = query(language, 'highlights')
    if highlights:
        for pattern, match in QueryCursor(highlights).matches(tree.root_node, custom_predicate):
            for capture, nodes in match.items():
                for node in nodes:
                    result.append({'capture': capture, 'parser': language, 'pattern': pattern,
                                   'start': offset + node.start_byte, 'end': offset + node.end_byte})
    injections = query(language, 'injections')
    if injections:
        for pattern, match in QueryCursor(injections).matches(tree.root_node, custom_predicate):
            settings = injections.pattern_settings(pattern)
            name = settings.get('injection.language')
            if 'injection.language' in match:
                name = match['injection.language'][0].text.decode('utf-8')
            name = {'markdown-inline': 'markdown_inline'}.get(name, name)
            for node in match.get('injection.content', []):
                if name not in languages or language != 'markdown':
                    gaps.append({'language': name, 'start': offset + node.start_byte, 'end': offset + node.end_byte,
                                 'reason': 'parser-not-in-matrix' if name not in languages else 'non-markdown-injection-not-evaluated'})
                    continue
                # Selected Markdown queries use contiguous inline/fence ranges.
                # No emulation of arbitrary Zed included-range/combined injections.
                nested, missing, _ = captures(name, node.text, offset + node.start_byte, depth + 1)
                result.extend(nested)
                gaps.extend(missing)
    return result, gaps, tree.root_node.has_error


def point(source, probe):
    line = probe['line'].encode('utf-8')
    lines = source.splitlines(keepends=True)
    rows = [i for i, value in enumerate(lines) if value.rstrip(b'\r\n') == line]
    assert len(rows) == 1, 'Missing or ambiguous anchor: ' + probe['line']
    return sum(map(len, lines[:rows[0]])) + line.index(probe['token'].encode('utf-8'))


def style_for(syntax, capture):
    # Zed syntax_theme.rs::highlight_id uses the longest dotted prefix.
    names = [name for name in syntax if capture == name or capture.startswith(name + '.')]
    assert names, 'No authored Zed style for capture ' + capture
    name = max(names, key=len)
    return name, syntax[name]


report = {'engine': 'tree-sitter-0.25.2-with-zed-queries', 'zedRuntime': False,
          'lockSha256': inputs['lockSha256'], 'results': [], 'injectionGaps': {}, 'parseErrors': {}}
for language in expectations:
    sample = catalog[language]
    source = (ROOT / 'tests/samples/languages' / sample['file']).read_bytes()
    found, gaps, errors = captures(language, source)
    report['injectionGaps'][language] = gaps
    report['parseErrors'][language] = errors
    assert not errors, 'Parse errors in ' + sample['file']
    for probe in expectations[language]:
        position = point(source, probe)
        candidates = [capture for capture in found if capture['start'] <= position < capture['end']]
        matches = [c for c in candidates if c['capture'] == probe['capture']]
        assert matches, (language, probe['id'], candidates)
        for theme in family['themes']:
            name, actual = style_for(theme['style']['syntax'], probe['capture'])
            expected = core_by_name[theme['name']]['syntax'][probe['role']]
            if 'foreground' in expected:
                assert actual.get('color') == expected['foreground'], (theme['name'], language, probe, actual, expected)
            if expected.get('bold'):
                assert actual.get('font_weight') == 700, (language, probe)
            if expected.get('italic'):
                assert actual.get('font_style') == 'italic', (language, probe)
            report['results'].append({'language': language, 'variant': theme['name'], 'probe': probe['id'],
                                      'capture': probe['capture'], 'styleName': name, 'style': actual})
(ROOT / 'test-results/zed-language-validation.json').write_text(json.dumps(report, indent=2), encoding='utf-8')
print(f"Zed queries: {len(report['results'])} grammar/style checks (not GUI rendering)")
