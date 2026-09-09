import importlib.util
from pathlib import Path
import tempfile
import json
import unittest
import subprocess
import shutil
from unittest.mock import patch

spec = importlib.util.spec_from_file_location('dependencies', Path(__file__).with_name('run.py'))
deps = importlib.util.module_from_spec(spec)
spec.loader.exec_module(deps)

class DependencyTests(unittest.TestCase):
    def test_local_candidate_keeps_real_revision_and_dirty_files_without_source_config(self):
        with tempfile.TemporaryDirectory() as temporary:
            source = Path(temporary) / 'source'; source.mkdir()
            target = Path(temporary) / 'target'
            def git(*args):
                return subprocess.check_output(['git', *args], cwd=source, text=True).strip()
            git('init', '--quiet')
            (source / 'sdk.rs').write_text('committed')
            (source / '.gitignore').write_text('private.env\n')
            git('add', '.')
            git('-c', 'user.name=Fixture', '-c', 'user.email=fixture@example.invalid',
                '-c', 'core.hooksPath=/dev/null', 'commit', '--quiet', '-m', 'fixture')
            revision = git('rev-parse', 'HEAD')
            git('config', 'credential.helper', 'fixture-must-not-copy')
            (source / 'sdk.rs').write_text('local edit')
            (source / 'private.env').write_text('ignored fixture')
            evidence = deps.snapshot(source, target)
            deps.preserve_local_revision(source, target, revision)
            self.assertEqual(deps.run(['git', 'rev-parse', 'HEAD'], target, capture=True).strip(), revision)
            self.assertTrue(evidence['dirty'])
            self.assertEqual((target / 'sdk.rs').read_text(), 'local edit')
            self.assertIn(' M sdk.rs', deps.run(['git', 'status', '--short'], target, capture=True))
            self.assertNotIn('fixture-must-not-copy', (target / '.git/config').read_text())
            self.assertFalse((target / 'private.env').exists())
            self.assertEqual(git('rev-parse', 'HEAD'), revision)
            self.assertEqual((source / 'sdk.rs').read_text(), 'local edit')

    def test_local_revision_mismatch_does_not_reset_snapshot(self):
        with tempfile.TemporaryDirectory() as temporary, patch.object(deps, 'run', side_effect=[None, None, 'b' * 40]) as run:
            with self.assertRaises(ValueError):
                deps.preserve_local_revision(Path(temporary), Path(temporary), 'a' * 40)
            self.assertFalse(any('reset' in call.args[0] for call in run.call_args_list))

    def test_e2e_evidence_binds_lock_after_local_install(self):
        with tempfile.TemporaryDirectory() as temporary:
            root = Path(temporary) / 'consumer'; root.mkdir()
            sdk = Path(temporary) / 'sdk'; sdk.mkdir()
            (root / 'pnpm-workspace.yaml').write_text('packages:\n  - .\n\nlinkWorkspacePackages: false\n')
            (root / 'pnpm-lock.yaml').write_text('original registry lock')
            config = root / 'dependencies.local.json'
            config.write_text(json.dumps({'schema_version': 1, 'dependencies': {'awiki-im-core': {'path': str(sdk)}}}))
            observed = []
            def snapshot(source, target):
                shutil.copytree(source, target, ignore=shutil.ignore_patterns('.artifacts'))
                return {'commit': 'a' * 40, 'tree': 'b' * 40, 'dirty': False}
            def run(command, cwd, env=None, capture=False):
                if command[:2] == ['pnpm', 'install']:
                    (cwd / 'pnpm-lock.yaml').write_text('resolved local lock')
                if command[:3] == ['pnpm', 'run', 'e2e:smoke']:
                    evidence = json.loads((cwd / '.artifacts/dependencies/consumer-source.json').read_text())
                    observed.append(evidence['files']['pnpm-lock.yaml'])
                return '{}' if capture else None
            with patch.object(deps, 'ROOT', root), patch.object(deps, 'snapshot', side_effect=snapshot), \
                    patch.object(deps, 'preserve_local_revision'), patch.object(deps, 'normalize_rust'), \
                    patch.object(deps, 'run', side_effect=run):
                self.assertEqual(deps.main(['--deps', 'local', '--local-config', str(config), '--command', 'e2e:smoke']), 0)
            self.assertEqual(observed, [deps.hashlib.sha256(b'resolved local lock').hexdigest()])
            self.assertEqual((root / 'pnpm-lock.yaml').read_text(), 'original registry lock')

    def test_fetched_sha_mismatch_is_rejected_before_checkout(self):
        with tempfile.TemporaryDirectory() as temp, patch.object(deps, 'run', side_effect=[None, None, 'b' * 40 + '\n']) as run:
            with self.assertRaises(ValueError):
                deps.fetch({'repository': 'https://example.invalid/sdk.git', 'commit': 'a' * 40}, Path(temp) / 'sdk')
            self.assertFalse(any('checkout' in call.args[0] for call in run.call_args_list))

    def test_source_manifest_rejects_moving_refs_and_credentials(self):
        with tempfile.TemporaryDirectory() as temp:
            path = Path(temp) / 'dependencies.source.json'
            item = {'repository': 'https://github.com/example/sdk.git', 'commit': 'a' * 40, 'pull_request': 'https://github.com/example/sdk/pull/1'}
            def write(): path.write_text(json.dumps({'schema_version': 1, 'dependencies': {'awiki-im-core': item}}))
            write(); self.assertEqual(deps.selection(path, 'source')['awiki-im-core']['commit'], 'a' * 40)
            for field, value in [('commit', 'my-branch'), ('repository', 'https://token@github.com/example/sdk.git')]:
                original = item[field]; item[field] = value; write()
                with self.assertRaises(ValueError): deps.selection(path, 'source')
                item[field] = original

    def test_local_paths_are_explicit_and_never_in_source_manifest(self):
        with tempfile.TemporaryDirectory() as temp:
            path = Path(temp) / 'local.json'
            path.write_text(json.dumps({'schema_version': 1, 'dependencies': {'awiki-im-core': {'path': '../my-core'}}}))
            self.assertEqual(deps.selection(path, 'local')['awiki-im-core']['path'], '../my-core')
            with self.assertRaises(ValueError): deps.selection(path, 'source')

    def test_registry_workspace_does_not_discover_siblings(self):
        text = 'packages:\n  - .\n  - packages/*\n\nlinkWorkspacePackages: false\nallowBuilds:\n  esbuild: true\n'
        self.assertEqual(deps.workspace_text(text, {}), text)
        local = deps.workspace_text(text, {'awiki-im-core': Path('/tmp/core')})
        self.assertIn('../awiki-cli-rs2/packages/awiki-im-core-node', local)
        self.assertIn('linkWorkspacePackages: true', local)
        self.assertNotIn('../anp/', local)
        self.assertEqual(text, deps.workspace_text(text, {}))

    def test_source_staging_retains_the_registry_manifest_for_contract_checks(self):
        with tempfile.TemporaryDirectory() as temporary:
            root = Path(temporary)
            canonical = 'packages:\n  - .\n  - packages/*\n\nlinkWorkspacePackages: false\n'
            (root / 'pnpm-workspace.yaml').write_text(canonical)
            deps.prepare_workspace(root, {'awiki-im-core': root / 'core'})
            self.assertEqual((root / '.artifacts/dependencies/canonical-pnpm-workspace.yaml').read_text(), canonical)
            generated = (root / 'pnpm-workspace.yaml').read_text()
            self.assertIn('linkWorkspacePackages: true', generated)
            self.assertIn('../awiki-cli-rs2/', generated)
            self.assertNotIn('../anp/', generated)

    def test_staged_source_evidence_binds_source_and_generated_workspace(self):
        with tempfile.TemporaryDirectory() as temporary:
            root = Path(temporary)
            (root / 'producer.ts').write_text('source')
            deps.write_consumer_source_evidence(root, {'commit': 'a' * 40, 'tree': 'b' * 40, 'dirty': False})
            evidence = json.loads((root / '.artifacts/dependencies/consumer-source.json').read_text())
            self.assertEqual(evidence['source']['commit'], 'a' * 40)
            self.assertEqual(evidence['files'], {'producer.ts': deps.hashlib.sha256(b'source').hexdigest()})

    def test_test_filter_cannot_turn_into_a_build_or_runner_option(self):
        with patch.object(deps, 'run') as run:
            for args in [['--test-filter', 'tests/example.spec.ts'], ['--command', 'test', '--test-filter=--passWithNoTests']]:
                with self.assertRaises(SystemExit): deps.main(args)
            run.assert_not_called()

    def test_release_rejects_local_before_any_install(self):
        with patch.object(deps, 'run') as run:
            with self.assertRaises(SystemExit): deps.main(['--profile', 'release', '--deps', 'local'])
            run.assert_not_called()

    def test_staged_native_dependencies_are_registry_unless_selected(self):
        with tempfile.TemporaryDirectory() as temp:
            core = Path(temp) / 'core'; core.mkdir()
            manifest = core / 'Cargo.toml'
            original = 'anp = { path = "../anp/rust", version = "=1.0.1", default-features = false }\nanp-identity = { path = "../identity", version = "=0.2.1", features = ["root-export"] }\n'
            manifest.write_text(original)
            deps.normalize_rust({'awiki-im-core': core})
            self.assertNotIn('path =', manifest.read_text())
            self.assertIn('features = ["root-export"]', manifest.read_text())

    def test_ci_runs_only_the_gate_supported_by_the_committed_dependency_mode(self):
        ci = (deps.ROOT / '.github/workflows/ci.yml').read_text()
        web = (deps.ROOT / '.github/workflows/web-e2e.yml').read_text()
        detector = 'if [[ -f dependencies.source.json ]]; then'
        self.assertIn(detector, ci)
        self.assertIn("if: needs.dependency-mode.outputs.mode == 'registry'", ci)
        self.assertIn("if: needs.dependency-mode.outputs.mode == 'source'", ci)
        self.assertIn(detector, web)
        self.assertEqual(web.count("if: needs.dependency-mode.outputs.mode == 'registry'"), 2)
        self.assertNotIn("hashFiles('dependencies.source.json')", ci)

if __name__ == '__main__': unittest.main()
