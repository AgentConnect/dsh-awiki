/** Self-hosted, unpublished Singapore combination. Uses only official DSH plugin commands. */
import assert from 'node:assert/strict'
import { createHash } from 'node:crypto'
import { readFile, writeFile, mkdir, copyFile, access } from 'node:fs/promises'
import { spawnSync } from 'node:child_process'
import { homedir } from 'node:os'
import { join, resolve } from 'node:path'
import { providerSmoke } from './singapore-provider-smoke.mjs'
const harnessPins = JSON.parse(await readFile(new URL('./singapore-harness-pins.json', import.meta.url),'utf8'))
const origin = 'https://anpclaw.com/downloads/singapore-full-20260922/plugins/'
const profile = 'singapore-full-20260922'
const opt = name => { const i=process.argv.indexOf('--'+name); return i<0?undefined:process.argv[i+1] }
const home = resolve(opt('home') ?? join(homedir(),'.dsh-singapore-test-20260922'))
const root = join(home,'profiles',profile)
const inputs = join(root,'.singapore-inputs')
const bundle = opt('bundle')
const dshBin = opt('dsh-bin')
const env = {...process.env,DSH_HOME:home,DSH_TELEMETRY_DISABLED:'1'}
function run(command,args,extra={}) {
 const r=spawnSync(command,args,{encoding:'utf8',env,timeout:300000,...extra})
 if(r.status!==0)throw new Error(r.error?.message ?? r.stderr ?? r.stdout)
 return r.stdout.trim()
}
function dsh(args) {
 if(dshBin)return run(process.execPath,[resolve(dshBin),...args])
 // Windows users supply the CLI's bin.js explicitly, avoiding cmd.exe quoting.
 assert.notEqual(process.platform,'win32','Windows requires --dsh-bin with the installed DSH lib/bin.js path')
 return run('dsh',args)
}
assert.equal(dsh(['--version']),'0.1.5-rc.2','Install DSH 0.1.5-rc.2 before the Singapore combination')
async function get(file) {
 assert.match(file,/^[a-zA-Z0-9._-]+$/)
 if(bundle)return readFile(join(resolve(bundle),file))
 const r=await fetch(new URL(file,origin));assert.equal(r.status,200,`download ${file}`);return Buffer.from(await r.arrayBuffer())
}
const manifestBytes=await get('manifest.json')
const manifest=JSON.parse(manifestBytes)
assert.equal(manifest.schemaVersion,2);assert.equal(manifest.channel,'singapore-test');assert.equal(manifest.published,false)
assert.equal(manifest.packages.length,15)
const names=new Set()
const checked=[]
for(const p of manifest.packages){
 assert.match(p.name,/^(@awiki\/(im-core-node(?:-(?:darwin-(?:arm64|x64)|linux-(?:arm64|x64)-gnu|win32-x64-msvc))?|dsh-plugin|dsh-model-proxy)|@agent-network-protocol\/(anp-identity(?:-(?:darwin-(?:arm64|x64)|linux-(?:arm64|x64)-gnu|win32-x64-msvc))?|dsh-anp-identity))$/)
 assert(!names.has(p.name),'duplicate package');names.add(p.name)
 assert.match(p.version,/^\d+\.\d+\.\d+-sg\.20260922\.1$/);assert.match(p.sha256,/^[a-f0-9]{64}$/)
 const data=await get(p.file);assert.equal(createHash('sha256').update(data).digest('hex'),p.sha256,p.name);checked.push([p,data])
}
const suffix={ 'darwin-arm64':'darwin-arm64','darwin-x64':'darwin-x64','linux-x64':'linux-x64-gnu','linux-arm64':'linux-arm64-gnu','win32-x64':'win32-x64-msvc'}[`${process.platform}-${process.arch}`]
assert(suffix,'Unsupported platform')
try { await access(join(root,'package.json'));throw new Error('Test profile already exists; select a new --home to preserve existing state') } catch(e){if(e.code!=='ENOENT')throw e}
await mkdir(inputs,{recursive:true})
for(const [p,data] of checked)await writeFile(join(inputs,p.file),data)
await writeFile(join(inputs,'manifest.json'),manifestBytes)
await writeFile(join(root,'pnpm-workspace.yaml'),'overrides:\n'+Object.entries(harnessPins).map(([k,v])=>`  ${JSON.stringify(k)}: ${JSON.stringify(v)}`).join('\n')+'\n'+manifest.packages.map(p=>`  ${JSON.stringify(p.name)}: ${JSON.stringify('file:./.singapore-inputs/'+p.file)}`).join('\n')+'\n')
const selected=['@agent-network-protocol/anp-identity',`@agent-network-protocol/anp-identity-${suffix}`,'@awiki/im-core-node',`@awiki/im-core-node-${suffix}`]
const archive=n=>join(inputs,manifest.packages.find(p=>p.name===n).file)
dsh(['plugin','--profile',profile,'add',...selected.map(archive)])
for(const n of ['@agent-network-protocol/dsh-anp-identity','@awiki/dsh-plugin','@awiki/dsh-model-proxy'])dsh(['plugin','--profile',profile,'add',archive(n)])
const composed=dsh(['--profile',profile,'--dump-default-config'])
for(const id of ['anp-identity','anp-identity-provider','awiki','awiki-provider','awiki-summary-provider'])assert.equal(composed.match(new RegExp(`^\\s*- id: ${id}$`,'gm'))?.length,1,id)
for(const name of [...selected,'@agent-network-protocol/dsh-anp-identity','@awiki/dsh-plugin','@awiki/dsh-model-proxy']){
 const installed=JSON.parse(await readFile(join(root,'node_modules',name,'package.json'),'utf8'))
 assert.equal(installed.version,manifest.packages.find(p=>p.name===name).version,name)
}
const smoke=join(root,'singapore-provider-smoke.mjs')
await writeFile(smoke,providerSmoke({identityRoot:join(home,'smoke/identity'),coreRoot:join(home,'smoke/core')}))
assert.equal(run(process.execPath,[smoke],{cwd:root}),'packed-provider-restart-ok')
console.log(JSON.stringify({ok:true,profile,home,platform:`${process.platform}-${process.arch}`,verifiedArchives:15,providerRestart:true,harnessVersion:'0.1.5-rc.2'}))
