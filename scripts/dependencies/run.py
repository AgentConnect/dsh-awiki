#!/usr/bin/env python3
"""DSH 的隔离 registry/local/source 构建入口。"""
from __future__ import annotations
import argparse
import hashlib
import json
import os
from pathlib import Path
import re
import shutil
import subprocess
import sys
import tempfile
from urllib.parse import urlsplit

ROOT = Path(__file__).resolve().parents[2]
SPECS = {
    'anp': ('anp/anp', []),
    'anp-identity': ('anp/anp-identity', ['bindings/node', 'bindings/node/npm/*', 'packages/dsh-anp-identity']),
    'awiki-im-core': ('awiki-cli-rs2', ['packages/awiki-im-core-node', 'packages/awiki-im-core-node-platforms/*']),
}


def run(command, cwd, env=None, capture=False):
    return subprocess.run(command, cwd=cwd, env=env, check=True, text=True,
                          stdout=subprocess.PIPE if capture else None).stdout


def selection(path, mode):
    data = json.loads(path.read_text())
    entries = data.get('dependencies')
    if data.get('schema_version') != 1 or not isinstance(entries, dict) or not entries:
        raise ValueError('Expected schema_version=1 and nonempty dependencies')
    for name, item in entries.items():
        if name not in SPECS or not isinstance(item, dict):
            raise ValueError(f'Unknown SDK {name}')
        if mode == 'local':
            if set(item) != {'path'} or not isinstance(item['path'], str) or not item['path']:
                raise ValueError('Local entries require only a repository path')
        else:
            if set(item) != {'repository', 'commit', 'pull_request'}:
                raise ValueError('Source entries require repository, commit, pull_request')
            url = urlsplit(item['repository'])
            if url.scheme != 'https' or not url.hostname or url.username or url.password or url.query or url.fragment:
                raise ValueError('Repository must be credential-free HTTPS')
            if not re.fullmatch('[0-9a-f]{40}', item['commit']):
                raise ValueError('Source commit must be an exact SHA, not a branch')
            if not isinstance(item['pull_request'], str) or not item['pull_request'].startswith('https://'):
                raise ValueError('Source dependency must identify its PR')
    if set(entries) == {'anp'}:
        raise ValueError('ANP source requires at least one native consumer')
    return entries


def snapshot(source, target):
    target.mkdir(parents=True)
    files = run(['git', 'ls-files', '-z', '--cached', '--others', '--exclude-standard'], source, capture=True)
    for name in set(files.split('\0')) - {''}:
        path = Path(name)
        if path.is_absolute() or '..' in path.parts:
            raise ValueError('Unsafe repository path')
        origin = source / path
        if origin.is_symlink():
            raise ValueError(f'Source symlink requires explicit packaging: {name}')
        if origin.is_file():
            destination = target / path
            destination.parent.mkdir(parents=True, exist_ok=True)
            shutil.copy2(origin, destination)
    digest = hashlib.sha256()
    for file in sorted(p for p in target.rglob('*') if p.is_file()):
        digest.update(file.relative_to(target).as_posix().encode() + b'\0')
        digest.update(hashlib.sha256(file.read_bytes()).digest())
    return {'tree_sha256': digest.hexdigest(), 'commit': run(['git', 'rev-parse', 'HEAD'], source, capture=True).strip(),
            'tree': run(['git', 'rev-parse', 'HEAD^{tree}'], source, capture=True).strip(),
            'dirty': bool(run(['git', 'status', '--porcelain'], source, capture=True).strip())}


def fetch(item, target):
    target.mkdir(parents=True)
    run(['git', 'init', '--quiet'], target)
    run(['git', '-c', 'credential.helper=', 'fetch', '--depth=1', item['repository'], item['commit']], target)
    actual = run(['git', 'rev-parse', 'FETCH_HEAD'], target, capture=True).strip()
    if actual != item['commit']:
        raise ValueError('Source SHA mismatch')
    run(['git', '-c', 'core.hooksPath=/dev/null', 'checkout', '--detach', '--quiet', actual], target)
    return {'commit': actual, 'dirty': False}


def workspace_text(text, roots):
    # Canonical workspace is registry-only. Generated local workspaces have
    # explicit sibling membership, never accidental discovery of developer dirs.
    packages = ['.', 'packages/*']
    for name in roots:
        packages.extend('../' + SPECS[name][0] + '/' + part for part in SPECS[name][1])
    text = re.sub(r'(?ms)^packages:\n.*?(?=^\S)', 'packages:\n' + ''.join('  - ' + p + '\n' for p in packages) + '\n', text, count=1)
    text = re.sub(r'(?m)^linkWorkspacePackages:.*$', 'linkWorkspacePackages: ' + ('true' if roots else 'false'), text)
    overrides = {}
    for name, root in roots.items():
        for pattern in SPECS[name][1]:
            for directory in root.glob(pattern):
                manifest = directory / 'package.json'
                if manifest.is_file():
                    package = json.loads(manifest.read_text())
                    overrides[package['name']] = 'link:../' + SPECS[name][0] + '/' + directory.relative_to(root).as_posix()
    if overrides:
        text += '\noverrides:\n' + ''.join('  ' + json.dumps(k) + ': ' + json.dumps(v) + '\n' for k, v in overrides.items())
    return text


def prepare_workspace(checkout, roots):
    workspace = checkout / 'pnpm-workspace.yaml'
    canonical = workspace.read_text()
    evidence = checkout / '.artifacts/dependencies/canonical-pnpm-workspace.yaml'
    evidence.parent.mkdir(parents=True, exist_ok=True)
    evidence.write_text(canonical)
    workspace.write_text(workspace_text(canonical, roots))


def write_consumer_source_evidence(checkout, source):
    files = {}
    for path in sorted(checkout.rglob('*')):
        relative = path.relative_to(checkout)
        if any(part in ('.git', 'node_modules', '.artifacts') for part in relative.parts):
            continue
        if path.is_file():
            files[relative.as_posix()] = hashlib.sha256(path.read_bytes()).hexdigest()
    evidence = checkout / '.artifacts/dependencies/consumer-source.json'
    evidence.parent.mkdir(parents=True, exist_ok=True)
    evidence.write_text(json.dumps({'schemaVersion': 1, 'source': source, 'files': files}, sort_keys=True) + '\n')


def normalize_rust(roots):
    paths = {'anp': 'rust', 'anp-identity': 'crates/anp-identity'}
    for owner in ('anp-identity', 'awiki-im-core'):
        if owner not in roots:
            continue
        manifest = roots[owner] / 'Cargo.toml'
        text = manifest.read_text()
        for name in (('anp',) if owner == 'anp-identity' else ('anp', 'anp-identity')):
            pattern = rf'(?m)^({re.escape(name)}\s*=\s*\{{)([^\n}}]*)(\}})'
            def replace(match):
                fields = re.sub(r'\bpath\s*=\s*"[^"]*"\s*,?\s*', '', match[2]).strip().strip(',')
                if name in roots:
                    fields += ', path = ' + json.dumps(str(roots[name] / paths[name]))
                return match[1] + fields + match[3]
            text, count = re.subn(pattern, replace, text)
            if count != 1:
                raise ValueError(f'{owner}: cannot select {name} source')
        manifest.write_text(text)


def generated_files(root):
    import hashlib
    return {str(p.relative_to(root)): hashlib.sha256(p.read_bytes()).hexdigest()
            for folder in ('lib', 'packages/dsh-model-proxy/lib')
            for p in (root / folder).rglob('*') if p.is_file()}


def main(argv=None):
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--profile', choices=['debug', 'release'], default='debug')
    parser.add_argument('--deps', choices=['registry', 'local', 'source'], default='registry')
    parser.add_argument('--local-config', type=Path)
    parser.add_argument('--source-manifest', type=Path)
    parser.add_argument('--resolve-only', action='store_true', help='只安装并校验依赖，不编译')
    parser.add_argument('--refresh-lock', action='store_true')
    parser.add_argument('--command', choices=['build', 'typecheck', 'verify', 'verify:workspace', 'test', 'e2e:smoke'], default='build')
    parser.add_argument('--test-filter', action='append', default=[], help='传递给 Vitest 的用例文件过滤，可重复；仅用于 --command test')
    args = parser.parse_args(argv)
    if args.test_filter and (args.command != 'test' or any(not value or value.startswith('-') for value in args.test_filter)):
        parser.error('--test-filter requires --command test and non-option filters')
    if args.profile == 'release' and (ROOT / 'dependencies.source.json').exists():
        parser.error('Resolve and remove dependencies.source.json before release')
    if args.deps == 'local' and args.refresh_lock:
        parser.error('Local mode must never update a committed lockfile')
    if args.profile == 'release' and (args.deps != 'registry' or args.refresh_lock or args.resolve_only):
        parser.error('Release requires locked registry dependencies')
    config = args.local_config if args.deps == 'local' else args.source_manifest
    if args.deps == 'registry' and (args.local_config or args.source_manifest):
        parser.error('Registry mode rejects local/source overrides')
    if args.deps != 'registry' and (config is None or bool(args.local_config) == bool(args.source_manifest)):
        parser.error('Select exactly one matching local config or source manifest')
    entries = selection(config.resolve(), args.deps) if config else {}
    if args.profile == 'release' and run(['git', 'status', '--porcelain', '--untracked-files=no'], ROOT, capture=True).strip():
        raise ValueError('Release requires committed source')
    artifacts = ROOT / '.artifacts/dependencies' / args.deps
    artifacts.mkdir(parents=True, exist_ok=True)
    with tempfile.TemporaryDirectory(prefix='dsh-deps-') as temporary:
        layout = Path(temporary)
        checkout = layout / 'dsh-awiki'
        evidence = {'mode': args.deps, 'profile': args.profile, 'consumer': snapshot(ROOT, checkout), 'dependencies': {}}
        roots = {}
        for name, item in entries.items():
            target = layout / SPECS[name][0]
            evidence['dependencies'][name] = (snapshot((config.resolve().parent / item['path']).resolve(), target)
                if args.deps == 'local' else fetch(item, target))
            if args.deps == 'source':
                evidence['dependencies'][name]['repository'] = item['repository']
            roots[name] = target
        generated_before = generated_files(checkout)
        normalize_rust(roots)
        # Source CI carries its Rust resolution locks as well as the pnpm lock.
        # A fixed repo SHA alone is insufficient after staged source rewrites.
        rust_locks = {}
        if args.deps == 'source':
            for owner in ('anp-identity', 'awiki-im-core'):
                if owner not in roots:
                    continue
                frozen = config.resolve().with_suffix('.' + owner + '.Cargo.lock')
                if not args.refresh_lock:
                    if not frozen.is_file():
                        raise ValueError(f'Source PR needs {frozen.name}; generate with --refresh-lock')
                    shutil.copy2(frozen, roots[owner] / 'Cargo.lock')
                rust_locks[owner] = frozen
        prepare_workspace(checkout, roots)
        lock = ROOT / 'pnpm-lock.yaml'
        if args.deps == 'source':
            lock = config.resolve().with_suffix('.pnpm-lock.yaml')
            if not args.refresh_lock and not lock.is_file():
                raise ValueError('Source PR needs committed .pnpm-lock.yaml; use --refresh-lock')
        if lock.is_file():
            shutil.copy2(lock, checkout / 'pnpm-lock.yaml')
        env = os.environ.copy()
        env.pop('CARGO_TARGET_DIR', None)
        env.update({'AWIKI_DEPENDENCY_MODE': args.deps, 'NODE_ENV': 'production' if args.profile == 'release' else 'development'})
        for name, key in [('anp-identity', 'AWIKI_LOCAL_IDENTITY_ROOT'), ('awiki-im-core', 'AWIKI_LOCAL_CORE_ROOT')]:
            if name in roots:
                env[key] = str(roots[name])
            else:
                env.pop(key, None)
        write_consumer_source_evidence(checkout, evidence['consumer'])
        (artifacts / 'resolution.json').write_text(json.dumps(evidence, indent=2) + '\n')
        run(['pnpm', 'install', '--registry=https://registry.npmjs.org', '--prod=false', '--no-frozen-lockfile' if args.refresh_lock or args.deps == 'local' else '--frozen-lockfile'], checkout, env)
        env['AWIKI_DEPENDENCY_FINGERPRINT'] = hashlib.sha256(
            json.dumps(evidence, sort_keys=True).encode() + (checkout / 'pnpm-lock.yaml').read_bytes()
        ).hexdigest()
        for owner, frozen in rust_locks.items():
            command = ['cargo', 'metadata', '--format-version', '1']
            if not args.refresh_lock:
                command.append('--locked')
            run(command, roots[owner], env, capture=True)
            if args.refresh_lock:
                shutil.copy2(roots[owner] / 'Cargo.lock', frozen)
        if args.refresh_lock:
            if args.deps == 'registry':
                run(['node', 'scripts/check-dependency-sources.mjs'], checkout, env)
            shutil.copy2(checkout / 'pnpm-lock.yaml', lock)
        else:
            evidence['resolved'] = json.loads(run(['node', 'scripts/check-dependency-sources.mjs'], checkout, env, capture=True))
            (artifacts / 'resolution.json').write_text(json.dumps(evidence, indent=2) + '\n')
            if not args.resolve_only:
                run(['pnpm', 'run', 'prepare:test-native'], checkout, env)
                run(['pnpm', 'run', args.command, *args.test_filter], checkout, env)
            if args.command == 'verify:workspace' and not args.resolve_only:
                if generated_files(checkout) != generated_before:
                    raise ValueError('Generated lib artifacts differ from the source snapshot; regenerate and commit them')
            if args.profile == 'release':
                run(['node', 'scripts/check-release-dependencies.mjs'], checkout, env)
            if not args.resolve_only and args.command in ('build', 'verify', 'verify:workspace'):
                run(['npm', 'pack', '--ignore-scripts', '--pack-destination', str(artifacts)], checkout, env)
        for owner, frozen in rust_locks.items():
            if (roots[owner] / 'Cargo.lock').read_bytes() != frozen.read_bytes():
                raise ValueError(f'{owner}: build changed the committed source dependency lock')
        evidence['lock_sha256'] = __import__('hashlib').sha256((checkout / 'pnpm-lock.yaml').read_bytes()).hexdigest()
        (artifacts / 'resolution.json').write_text(json.dumps(evidence, indent=2) + '\n')
    return 0


if __name__ == '__main__':
    try:
        sys.exit(main())
    except (ValueError, OSError, subprocess.CalledProcessError) as error:
        print(f'ERROR: {error}', file=sys.stderr)
        sys.exit(1)
