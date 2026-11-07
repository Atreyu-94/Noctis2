"""Fetch pinned test-only grammars and compile their generated C parsers.

Run with Python 3.11+ and cc (Unix) or an x64 MSVC developer environment.
Downloads and compiled dependencies stay under ignored test-results/.
"""
import hashlib
import json
import os
from pathlib import Path
import re
import shutil
import subprocess
import sys
import tarfile
import urllib.request

ROOT = Path(__file__).resolve().parents[1]
CACHE = ROOT / 'test-results/native-languages'
LOCK_PATH = ROOT / 'tests/native-languages.lock.json'
lock = json.loads(LOCK_PATH.read_text(encoding='utf-8'))
CACHE.mkdir(parents=True, exist_ok=True)


def checkout(spec):
    repo, rev = spec['repo'], spec['rev']
    assert re.fullmatch(r'[\w.-]+/[\w.-]+', repo), repo
    assert re.fullmatch(r'[a-f0-9]{40}', rev), rev
    name = repo.replace('/', '--') + '-' + rev
    destination = CACHE / 'sources' / name
    if (destination / '.ready').exists():
        return destination
    archive = CACHE / (name + '.tar.gz')
    if not archive.exists():
        print('Downloading ' + repo + '@' + rev[:10], flush=True)
        temporary = archive.with_suffix('.download')
        urllib.request.urlretrieve(f'https://codeload.github.com/{repo}/tar.gz/{rev}', temporary)
        temporary.replace(archive)
    destination.mkdir(parents=True, exist_ok=True)
    with tarfile.open(archive) as tar:
        # Remove the archive's single root directory; reject traversal/unsafe links.
        members = tar.getmembers()
        for member in members:
            parts = member.name.split('/', 1)
            if len(parts) == 1 or not parts[1]:
                continue
            member.name = parts[1]
            tar.extract(member, destination, filter='data')
    (destination / '.ready').write_text(rev)
    return destination


def run(args, cwd=None):
    result = subprocess.run(args, cwd=cwd, capture_output=True, text=True, encoding='utf-8', errors='replace')
    if result.returncode:
        raise RuntimeError(f'{args[0]} failed:\n{result.stdout}\n{result.stderr}')


providers = {name: checkout(spec) for name, spec in lock['providers'].items()}
inputs = {'lockSha256': hashlib.sha256(LOCK_PATH.read_bytes()).hexdigest(), 'providers': lock['providers']}
for port in ['neovim', 'zed']:
    inputs[port] = {}
    parser_dir = CACHE / port / 'parser'
    parser_dir.mkdir(parents=True, exist_ok=True)
    if port == 'neovim':
        shutil.copytree(providers['neovim'] / 'runtime/queries', CACHE / port / 'queries', dirs_exist_ok=True)
    for language, spec in lock[port].items():
        source = checkout(spec) / spec['subdir']
        sources = [source / 'src/parser.c']
        if (source / 'src/scanner.c').exists():
            sources.append(source / 'src/scanner.c')
        assert all(path.is_file() for path in sources), f'No generated C parser: {source}'
        library = parser_dir / (language + ('.dll' if os.name == 'nt' else '.so'))
        print('Compiling ' + port + '/' + language, flush=True)
        if os.name == 'nt':
            objects = CACHE / port / ('objects-' + language)
            objects.mkdir(exist_ok=True)
            run(['cl.exe', '/nologo', '/LD', '/O2', '/utf-8', '/I' + str(source / 'src'),
                 *map(str, sources), '/link', '/OUT:' + str(library)], cwd=objects)
        else:
            run([os.environ.get('CC', 'cc'), '-shared', '-fPIC', '-O2', '-I', str(source / 'src'),
                 *map(str, sources), '-o', str(library)])
        query_dir = (CACHE / port / 'queries' / language if port == 'neovim'
                     else providers[spec['provider']] / spec['queries'])
        query = query_dir / 'highlights.scm'
        assert query.is_file(), query
        inputs[port][language] = {**spec, 'library': str(library), 'queries': str(query_dir),
            'parserSha256': hashlib.sha256(sources[0].read_bytes()).hexdigest(),
            'querySha256': hashlib.sha256(query.read_bytes()).hexdigest()}

# A test-only Python binding executes the real Zed queries outside its GUI.
run([sys.executable, '-m', 'pip', 'install', '--disable-pip-version-check', '--target',
     str(CACHE / 'python'), 'tree-sitter==0.25.2'])
(CACHE / 'inputs.json').write_text(json.dumps(inputs, indent=2), encoding='utf-8')
print('Prepared native language fixtures: ' + str(CACHE / 'inputs.json'))
