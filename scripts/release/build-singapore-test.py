#!/usr/bin/env python3
"""从固定 Git 提交和已核验原生包构建自托管测试组合，不发布 npm。"""
from pathlib import Path
import argparse, hashlib, io, json, os, re, shutil, subprocess, tarfile
ROOT = Path(__file__).resolve().parents[2]
VERSIONS = {'@agent-network-protocol/dsh-anp-identity': '0.1.4-sg.20260922.2', '@awiki/dsh-plugin': '0.3.15-sg.20260923.2', '@awiki/dsh-model-proxy': '0.1.10-sg.20260923.2'}

def run(args, cwd, env=None):
    subprocess.run([str(a) for a in args], cwd=cwd, env=env, check=True)

def digest(path):
    return hashlib.sha256(path.read_bytes()).hexdigest()

def unpack_manifest(path):
    with tarfile.open(path) as archive:
        return json.load(archive.extractfile('package/package.json'))

def native_inputs(root):
    selected = {}
    # One canonical wrapper; platform-specific binaries retain their own provenance.
    for platform in ['linux-x64', 'darwin-arm64', 'darwin-x64', 'linux-arm64', 'windows-x64']:
        files = sorted((root / platform).rglob('*.tgz'))
        if len(files) != 4:
            raise ValueError(f'Expected both wrappers and native packages for {platform}')
        for path in files:
            expected = path.with_name(path.name + '.sha256').read_text().split()[0]
            if digest(path) != expected:
                raise ValueError(f'Native checksum mismatch: {path.name}')
            manifest = unpack_manifest(path)
            name, version = manifest['name'], manifest['version']
            expected_version = ('0.2.10-sg.20260923.2' if name.startswith('@awiki/im-core-node')
                                else '0.2.4-sg.20260922.1')
            if version != expected_version:
                raise ValueError(f'Unexpected native candidate version: {name}@{version}')
            if not name.startswith(('@awiki/im-core-node', '@agent-network-protocol/anp-identity')):
                raise ValueError('Unexpected native package')
            if name not in selected:
                selected[name] = dict(name=name, version=version, path=str(path.resolve()), sha256=expected)
    if len(selected) != 12:
        raise ValueError('Incomplete native platform inventory')
    return list(selected.values())

def export(repo, ref, destination):
    data = subprocess.check_output(['git', '-C', str(repo), 'archive', ref])
    destination.mkdir(parents=True)
    with tarfile.open(fileobj=io.BytesIO(data)) as archive:
        archive.extractall(destination, filter='data')

def write_json(path, data):
    path.write_text(json.dumps(data, ensure_ascii=False, indent=2) + '\n')

def install(root, packages, lock_name, refresh):
    inputs = root / '.test-inputs'; inputs.mkdir()
    overrides = {}
    for package in packages:
        src = Path(package['path']);shutil.copy2(src, inputs / src.name)
        overrides[package['name']] = 'file:./.test-inputs/' + src.name
    workspace = root / 'pnpm-workspace.yaml'
    text = workspace.read_text() if workspace.exists() else 'packages:\n  - .\n'
    if '\noverrides:' in text:
        raise ValueError('Refuse to replace preexisting dependency overrides')
    workspace.write_text(text + '\nsupportedArchitectures:\n  os: [darwin, linux, win32]\n  cpu: [arm64, x64]\n  libc: [glibc]\n\noverrides:\n' + ''.join('  '+json.dumps(k)+': '+json.dumps(v)+'\n' for k,v in overrides.items()))
    frozen = ROOT / 'scripts/release' / lock_name
    if not refresh:
        shutil.copy2(frozen, root / 'pnpm-lock.yaml')
    run(['corepack','pnpm','install','--ignore-scripts','--no-frozen-lockfile' if refresh else '--frozen-lockfile'], root)
    if refresh:
        shutil.copy2(root / 'pnpm-lock.yaml', frozen)
    elif digest(root / 'pnpm-lock.yaml') != digest(frozen):
        raise ValueError('Test dependency lock changed')

def pack(root, output, commit, packages):
    manifest = json.loads((root/'package.json').read_text())
    write_json(root/'singapore-source.json', {'channel':'singapore-test','published':False,'sourceCommit':commit,'package':manifest['name'],'version':manifest['version'],'dependencies':[{k:p[k] for k in ['name','version','sha256']} for p in packages]})
    manifest['files'] = [*manifest.get('files', []), 'singapore-source.json']
    manifest['private'] = True
    write_json(root/'package.json',manifest)
    before=set(output.glob('*.tgz'));run(['npm','pack','--ignore-scripts','--pack-destination',output],root)
    added=set(output.glob('*.tgz'))-before
    if len(added)!=1:raise ValueError('Unexpected pack inventory')
    path=added.pop();return dict(name=manifest['name'],version=manifest['version'],path=str(path),sha256=digest(path),sourceCommit=commit)

def main():
    parser=argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--native-root',type=Path,required=True);parser.add_argument('--output',type=Path,required=True)
    parser.add_argument('--identity-plugin',type=Path,required=True)
    parser.add_argument('--refresh-lock',action='store_true');args=parser.parse_args()
    output=args.output.resolve();output.mkdir(parents=True,exist_ok=False)
    packages=native_inputs(args.native_root.resolve())
    identity_plugin=args.identity_plugin.resolve()
    with tarfile.open(identity_plugin) as archive:
        manifest=json.load(archive.extractfile('package/package.json'))
    if (manifest['name']!='@agent-network-protocol/dsh-anp-identity'
        or manifest['version']!=VERSIONS[manifest['name']]):
        raise ValueError('Identity plugin does not match the previously verified candidate')
    packages.append(dict(name=manifest['name'],version=manifest['version'],path=str(identity_plugin),sha256=digest(identity_plugin)))
    for p in packages:
        path=output/Path(p['path']).name;shutil.copy2(p['path'],path);p['path']=str(path)
        with tarfile.open(path) as t:
            member='package/singapore-source.json' if p['name']=='@agent-network-protocol/dsh-anp-identity' else 'package/provenance.json'
            receipt=json.load(t.extractfile(member))
        p['sourceCommit']=receipt.get('sourceCommit') or receipt.get('source',{}).get('commit')
        if not re.fullmatch(r'[0-9a-f]{40}', p['sourceCommit'] or ''):
            raise ValueError(f'Missing immutable source receipt: {p["name"]}')
    work=output/'build';work.mkdir()
    ref=subprocess.check_output(['git','-C',str(ROOT),'rev-parse','HEAD'],text=True).strip();consumer=work/'awiki';export(ROOT,ref,consumer)
    for directory in [consumer,consumer/'packages/dsh-model-proxy']:
        p=directory/'package.json';manifest=json.loads(p.read_text());manifest['version']=VERSIONS[manifest['name']]
        for group in ['dependencies','devDependencies','peerDependencies']:
            for name in list(manifest.get(group,{})):
                if name=='@awiki/im-core-node':manifest[group][name]='0.2.10-sg.20260923.2'
                elif name=='@agent-network-protocol/dsh-anp-identity':manifest[group][name]=VERSIONS[name]
                elif name=='@awiki/dsh-plugin' and group=='peerDependencies':manifest[group][name]=VERSIONS[name]
        write_json(p,manifest)
    install(consumer,packages,'singapore-awiki.pnpm-lock.yaml',args.refresh_lock)
    bundle=output/'build-inputs.json';write_json(bundle,{'schemaVersion':1,'channel':'singapore-test','published':False,'packages':packages})
    env=dict(os.environ,AWIKI_DEPENDENCY_MODE='test-source',AWIKI_TEST_BUNDLE_MANIFEST=str(bundle),NODE_ENV='production')
    for command in [['run','build'],['run','typecheck'],['--filter','@awiki/dsh-model-proxy','run','build'],['--filter','@awiki/dsh-model-proxy','run','typecheck']]:run(['corepack','pnpm',*command],consumer,env)
    packages.append(pack(consumer,output,ref,packages));packages.append(pack(consumer/'packages/dsh-model-proxy',output,ref,packages))
    write_json(output/'manifest.json',{'schemaVersion':1,'channel':'singapore-test','published':False,'harnessVersion':'0.1.5-rc.2','packages':packages})
    print('Singapore test combination built:',output)

if __name__=='__main__':main()
