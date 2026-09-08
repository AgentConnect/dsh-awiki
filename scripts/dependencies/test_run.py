import importlib.util
from pathlib import Path
import tempfile
import json
import unittest
from unittest.mock import patch

spec = importlib.util.spec_from_file_location('dependencies', Path(__file__).with_name('run.py'))
deps = importlib.util.module_from_spec(spec)
spec.loader.exec_module(deps)

class DependencyTests(unittest.TestCase):
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

if __name__ == '__main__': unittest.main()
