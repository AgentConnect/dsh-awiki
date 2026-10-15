"""Run the owning Web capability case with task-only profile, account and state."""
from __future__ import annotations

import argparse
import hashlib
import json
import os
from pathlib import Path
import secrets
import shutil
import signal
import subprocess
import time


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument('--candidate', type=Path, required=True)
    parser.add_argument('--run-root', type=Path, required=True)
    parser.add_argument('--official-fixture', type=Path)
    args = parser.parse_args()
    candidate = args.candidate.resolve()
    root = args.run_root.resolve()
    manifest = json.loads((candidate / 'candidate.json').read_text())
    profile = candidate / 'dsh-home/profiles/web'
    assert hashlib.sha256((profile / 'pnpm-lock.yaml').read_bytes()).hexdigest() == manifest['profileLockSha256']
    root.mkdir(parents=True, mode=0o700, exist_ok=False)
    # The candidate contains package/configuration files only; product identities
    # are always stored outside DSH_HOME, in the fresh paths below.
    shutil.copytree(candidate / 'dsh-home', root / 'dsh-home', symlinks=True)
    origin = 'https://openserver-adapt.anpclaw.com'
    verification = {}
    if args.official_fixture is not None:
        protected = args.official_fixture
        if protected.is_symlink() or not protected.is_file() or protected.stat().st_mode & 0o077:
            raise RuntimeError('Protected official fixture required')
        values = json.loads(protected.read_text())
        if set(values) != {'DEV_OTP_PHONE', 'DEV_OTP_CODE', 'HANDLE_REGISTRATION_PHONE_WHITELIST'}:
            raise RuntimeError('Unexpected official fixture fields')
        verification = {'phone': values['DEV_OTP_PHONE'], 'otp': values['DEV_OTP_CODE']}
        origin = 'https://backend-adapt.anpclaw.com'
    domain = origin.removeprefix('https://')
    env = {key: os.environ[key] for key in ['PATH', 'LANG', 'TMPDIR', 'SSL_CERT_FILE', 'NODE_EXTRA_CA_CERTS'] if key in os.environ}
    env.update({
        'DSH_HOME': str(root / 'dsh-home'), 'DSH_TELEMETRY_DISABLED': '1',
        'DSH_ANP_IDENTITY_STATE_ROOT': str(root / 'identity'),
        'DSH_ANP_IDENTITY_ROOT_KEY_PROVIDER': 'local-file',
        'DSH_ANP_IDENTITY_ROOT_KEY_PROVIDER_ID': 'capability-acceptance',
        'DSH_AWIKI_STATE_ROOT': str(root / 'awiki'),
        'DSH_AWIKI_USER_SERVICE_URL': origin,
        'DSH_AWIKI_USER_SERVICE_DOMAIN': domain,
        'DSH_AWIKI_MESSAGE_SERVICE_URL': origin,
        'DSH_AWIKI_MESSAGE_SERVICE_PUBLIC_URL': origin,
        'DSH_AWIKI_MESSAGE_SERVICE_DID': 'did:wba:' + domain,
        'DSH_AWIKI_REALTIME_ENABLED': 'true', 'DSH_AWIKI_LISTENER_ENABLED': 'false',
    })
    log_path = root / 'harness-private.log'
    log_path.touch(mode=0o600)
    with log_path.open('w') as log:
        child = subprocess.Popen(['node_modules/.bin/dsh', 'web', '--no-open', '--host', '127.0.0.1', '--port', '0'], env=env, stdout=log, stderr=subprocess.STDOUT, start_new_session=True)
        try:
            url = None
            deadline = time.monotonic() + 120
            while time.monotonic() < deadline:
                for line in log_path.read_text().splitlines():
                    if line.startswith('dsh web: http://127.0.0.1:'):
                        url = line.removeprefix('dsh web: ').strip()
                if url:
                    break
                if child.poll() is not None:
                    raise RuntimeError('Candidate Harness exited; see protected log')
                time.sleep(0.2)
            if not url:
                raise RuntimeError('Candidate Harness did not become ready')
            fixture = root / 'fixture.json'
            fixture.touch(mode=0o600)
            fixture.write_text(json.dumps({'url': url, 'origin': origin, 'handle': 'adaptweb' + secrets.token_hex(5), **verification}))
            # Playwright can include input values in failure context even when
            # screenshots/trace are off. Keep its raw output private and apply
            # the same artifact scanner used by the owning live E2E runner.
            output_fd = os.open(root / 'playwright.private.log', os.O_WRONLY | os.O_CREAT | os.O_EXCL, 0o600)
            with os.fdopen(output_fd, 'w') as output:
                result = subprocess.run(['node_modules/.bin/playwright', 'test', '--project=backend-capabilities-chromium'], env={**env, 'DSH_CAPABILITY_FIXTURE': str(fixture), 'DSH_AWIKI_E2E_OUTPUT_DIR': str(root / 'report')}, stdout=output, stderr=subprocess.STDOUT)
            scan = subprocess.run(['node', 'tests/e2e/support/scan-capability-artifacts.ts', str(root)], env=env)
            print(json.dumps({'playwright_exit': result.returncode, 'artifact_scan_exit': scan.returncode}))
            raise SystemExit(result.returncode or scan.returncode)
        finally:
            if child.poll() is None:
                os.killpg(child.pid, signal.SIGTERM)
            try:
                child.wait(timeout=15)
            except subprocess.TimeoutExpired:
                os.killpg(child.pid, signal.SIGKILL)
                child.wait()
            (root / 'cleanup.json').write_text(json.dumps({'harness_stopped': True, 'automatic_state': 'retained', 'remote_task_account': 'retained', 'manual_state': 'untouched'}))


if __name__ == '__main__':
    main()
