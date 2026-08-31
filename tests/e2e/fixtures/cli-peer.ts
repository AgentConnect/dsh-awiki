import { randomBytes } from 'node:crypto'
import { spawn } from 'node:child_process'
import { mkdir, writeFile } from 'node:fs/promises'
import { join } from 'node:path'
import type { ProtectedE2eConfig } from './protected-config.ts'

const maximumOutputBytes = 2 * 1024 * 1024

export interface CliPeerState {
  readonly root: string
  readonly home: string
  readonly workspace: string
  readonly vaultRootKey: string
  readonly handle: string
  readonly did: string
  readonly accountId: string
}

export interface DirectMessageExpectation {
  readonly id?: string
  readonly content: string
  readonly senderDid: string
  readonly receiverDid: string
  readonly peer: string
}

interface CliEnvelope {
  readonly ok?: unknown
  readonly data?: unknown
}

function safeAction(args: readonly string[]): string {
  for (const [needle, action] of [
    [['version'], 'version'],
    [['init'], 'init'],
    [['tenant', 'create'], 'tenant_create'],
    [['tenant', 'use'], 'tenant_use'],
    [['id', 'register'], 'id_register'],
    [['id', 'resolve'], 'id_resolve'],
    [['msg', 'send'], 'msg_send'],
    [['msg', 'inbox'], 'msg_inbox'],
    [['msg', 'history'], 'msg_history'],
    [['group', 'list'], 'group_list'],
    [['group', 'members'], 'group_members'],
    [['group', 'messages'], 'group_messages'],
  ] as const) {
    if (needle.every(value => args.includes(value))) return action
  }
  return 'unknown'
}

function safeFailureCode(source: string): string {
  try {
    const payload = JSON.parse(source) as {
      readonly error?: {
        readonly code?: unknown
        readonly details?: { readonly service_code?: unknown }
      }
    }
    const values = [payload.error?.code, payload.error?.details?.service_code]
      .filter((value): value is string => typeof value === 'string' && /^[A-Za-z0-9._-]{1,80}$/u.test(value))
    return values.length === 0 ? 'unknown' : values.join('/')
  } catch {
    return 'unknown'
  }
}

function delay(ms: number): Promise<void> {
  return new Promise(resolveDelay => setTimeout(resolveDelay, ms))
}

function requireObject(value: unknown, label: string): Record<string, unknown> {
  if (typeof value !== 'object' || value === null || Array.isArray(value)) {
    throw new Error(`DSH E2E CLI ${label} is invalid`)
  }
  return value as Record<string, unknown>
}

function requireString(value: unknown, label: string): string {
  if (typeof value !== 'string' || value === '') throw new Error(`DSH E2E CLI ${label} is invalid`)
  return value
}

export class CliPeer {
  readonly state: CliPeerState
  readonly #binary: string

  private constructor(binary: string, state: CliPeerState) {
    this.#binary = binary
    this.state = state
  }

  static async provision(config: ProtectedE2eConfig, root: string, handle: string): Promise<CliPeer> {
    const home = join(root, 'home')
    const workspace = join(root, 'workspace')
    const vaultRootKey = randomBytes(32).toString('base64url')
    await mkdir(home, { recursive: true })
    await mkdir(workspace, { recursive: true })
    const pending = new CliPeer(config.cliBinary, {
      root,
      home,
      workspace,
      vaultRootKey,
      handle,
      did: 'pending',
      accountId: 'pending',
    })
    const version = await pending.run(['--format', 'json', 'version'])
    const versionData = requireObject(version.data, 'version data')
    if (versionData.commit !== config.cliSourceRef) throw new Error('DSH E2E CLI source ref mismatch')
    await pending.run(['--format', 'json', 'init'])
    const tenant = `dsh-e2e-${handle}`
    await pending.run([
      '--format', 'json', 'tenant', 'create', tenant,
      '--backend-base-url', 'https://rwiki.cn',
      '--did-host', 'rwiki.cn',
      '--display-name', 'DSH E2E',
    ])
    await pending.run(['--format', 'json', 'tenant', 'use', tenant])
    const tenantRoot = join(workspace, 'tenants', tenant)
    await mkdir(tenantRoot, { recursive: true })
    await writeFile(join(tenantRoot, 'config.yaml'), pending.configYaml(), { mode: 0o600 })
    await pending.runWithStdin(
      ['--format', 'json', 'id', 'register', '--handle', handle, '--verification-stdin'],
      JSON.stringify({ phone: config.phone }),
    )
    const registered = await pending.runWithStdin(
      ['--format', 'json', 'id', 'register', '--handle', handle, '--verification-stdin'],
      JSON.stringify({ phone: config.phone, otp: config.otp }),
    )
    const data = requireObject(registered.data, 'registration data')
    const identity = requireObject(data.identity, 'registration identity')
    const did = requireString(identity.did, 'registration DID')
    const accountId = requireString(data.account_id, 'registration account ID')
    const state: CliPeerState = { root, home, workspace, vaultRootKey, handle, did, accountId }
    return new CliPeer(config.cliBinary, state)
  }

  static reopen(config: ProtectedE2eConfig, state: CliPeerState): CliPeer {
    if (state.did === 'pending' || state.accountId === 'pending') throw new Error('DSH E2E CLI state is incomplete')
    return new CliPeer(config.cliBinary, state)
  }

  async resolveDid(handle: string): Promise<string> {
    const payload = await this.run(['--format', 'json', 'id', 'resolve', '--handle', handle])
    const data = requireObject(payload.data, 'resolve data')
    const resolve = requireObject(data.resolve, 'resolve result')
    return requireString(resolve.did, 'resolved DID')
  }

  async primeDirectInbox(): Promise<void> {
    const payload = await this.run([
      '--format', 'json', 'msg', 'inbox', '--scope', 'direct', '--limit', '100',
    ])
    const data = requireObject(payload.data, 'initial inbox data')
    if (!Array.isArray(data.messages)) throw new Error('DSH E2E CLI initial inbox is invalid')
  }

  async sendDirect(targetDid: string, content: string, messageId: string): Promise<string> {
    const textPath = join(this.state.root, `${messageId}.txt`)
    await writeFile(textPath, content, { mode: 0o600 })
    const payload = await this.run([
      '--format', 'json', 'msg', 'send',
      '--to', targetDid,
      '--text-file', textPath,
      '--client-message-id', messageId,
      '--idempotency-key', `op-${messageId}`,
    ])
    const data = requireObject(payload.data, 'send data')
    const message = requireObject(data.message, 'send message')
    const delivery = requireObject(data.delivery, 'send delivery')
    if (delivery.accepted !== true) throw new Error('DSH E2E CLI Direct was not accepted')
    return requireString(message.id, 'send message ID')
  }

  async assertGroupSendRejected(groupDid: string, content: string, messageId: string): Promise<void> {
    try {
      await this.sendGroup(groupDid, content, messageId)
    } catch (error) {
      if (
        error instanceof Error
        && /^DSH E2E CLI msg_send failed \((?:not_found|permission_denied|service_error\/group\.not_member)\)$/u.test(error.message)
      ) return
      throw error
    }
    throw new Error('DSH E2E non-member Group send was accepted')
  }

  async sendGroup(groupDid: string, content: string, messageId: string): Promise<string> {
    const textPath = join(this.state.root, `${messageId}.txt`)
    await writeFile(textPath, content, { mode: 0o600 })
    const payload = await this.run([
      '--format', 'json', 'msg', 'send',
      '--group', groupDid,
      '--text-file', textPath,
      '--client-message-id', messageId,
      '--idempotency-key', `op-${messageId}`,
    ])
    const data = requireObject(payload.data, 'group send data')
    const message = requireObject(data.message, 'group send message')
    const delivery = requireObject(data.delivery, 'group send delivery')
    if (delivery.accepted !== true) throw new Error('DSH E2E CLI Group was not accepted')
    return requireString(message.id, 'group send message ID')
  }

  async waitForGroup(title: string, memberDids: readonly string[], timeoutMs = 60_000): Promise<string> {
    const deadline = Date.now() + timeoutMs
    while (Date.now() < deadline) {
      const listed = await this.run(['--format', 'json', 'group', 'list', '--limit', '100'])
      const listData = requireObject(listed.data, 'group list data')
      const groups = listData.groups
      if (!Array.isArray(groups)) throw new Error('DSH E2E CLI group list is invalid')
      const matching = groups.filter(item => (
        typeof item === 'object' && item !== null && !Array.isArray(item)
        && (item as Record<string, unknown>).name === title
      ))
      if (matching.length > 1) throw new Error('DSH E2E CLI projected a duplicate Group')
      if (matching.length === 1) {
        const groupDid = requireString((matching[0] as Record<string, unknown>).group_did, 'group DID')
        const members = await this.run([
          '--format', 'json', 'group', 'members', '--group', groupDid, '--limit', '100',
        ])
        const membersData = requireObject(members.data, 'group members data')
        if (!Array.isArray(membersData.members)) throw new Error('DSH E2E CLI group members are invalid')
        const activeDids = new Set(membersData.members.flatMap(item => {
          if (typeof item !== 'object' || item === null || Array.isArray(item)) return []
          const member = item as Record<string, unknown>
          return member.status === 'active' && typeof member.member_did === 'string' ? [member.member_did] : []
        }))
        if (memberDids.every(did => activeDids.has(did))) return groupDid
      }
      await delay(500)
    }
    throw new Error('DSH E2E CLI Group did not converge before timeout')
  }

  async waitForGroupMessage(
    groupDid: string,
    expected: { readonly content: string; readonly senderDid: string; readonly id?: string },
    timeoutMs = 60_000,
  ): Promise<string> {
    const deadline = Date.now() + timeoutMs
    while (Date.now() < deadline) {
      const payload = await this.run([
        '--format', 'json', 'group', 'messages', '--group', groupDid, '--limit', '100',
      ])
      const data = requireObject(payload.data, 'group messages data')
      if (!Array.isArray(data.messages)) throw new Error('DSH E2E CLI group messages are invalid')
      const matches = data.messages.filter(item => {
        if (typeof item !== 'object' || item === null || Array.isArray(item)) return false
        const message = item as Record<string, unknown>
        return (expected.id === undefined || message.id === expected.id)
          && message.group_did === groupDid
          && message.content === expected.content
          && message.sender_did === expected.senderDid
      })
      if (matches.length > 1) throw new Error('DSH E2E CLI projected a duplicate Group message')
      if (matches.length === 1) return requireString(
        (matches[0] as Record<string, unknown>).id,
        'observed group message ID',
      )
      await delay(500)
    }
    throw new Error('DSH E2E CLI Group message did not converge before timeout')
  }

  async waitForDirect(expected: DirectMessageExpectation, timeoutMs = 60_000): Promise<string> {
    const deadline = Date.now() + timeoutMs
    let hydrated = false
    while (Date.now() < deadline) {
      const payload = hydrated
        ? await this.run(['--format', 'json', 'msg', 'history', '--with', expected.peer, '--limit', '100'])
        : await this.run(['--format', 'json', 'msg', 'inbox', '--scope', 'direct', '--limit', '100'])
      hydrated = true
      const data = requireObject(payload.data, 'message data')
      const messages = data.messages
      if (!Array.isArray(messages)) throw new Error('DSH E2E CLI message list is invalid')
      const matches = messages.filter(item => {
        if (typeof item !== 'object' || item === null || Array.isArray(item)) return false
        const message = item as Record<string, unknown>
        return (expected.id === undefined || message.id === expected.id)
          && message.content === expected.content
          && message.sender_did === expected.senderDid
          && message.receiver_did === expected.receiverDid
      })
      if (matches.length > 1) throw new Error('DSH E2E CLI projected a duplicate Direct')
      if (matches.length === 1) {
        const message = matches[0] as Record<string, unknown>
        if (message.secure !== false) throw new Error('DSH E2E CLI Direct projection does not match')
        const observedId = requireString(message.id, 'observed message ID')
        await delay(750)
        const stable = await this.run([
          '--format', 'json', 'msg', 'history', '--with', expected.peer, '--limit', '100',
        ])
        const stableData = requireObject(stable.data, 'stable history data')
        if (!Array.isArray(stableData.messages)
          || stableData.messages.filter(item => (
            typeof item === 'object' && item !== null && !Array.isArray(item)
            && (item as Record<string, unknown>).id === observedId
          )).length !== 1) {
          throw new Error('DSH E2E CLI Direct did not remain exact-one')
        }
        return observedId
      }
      await delay(500)
    }
    throw new Error('DSH E2E CLI Direct did not converge before timeout')
  }

  private configYaml(): string {
    return [
      'schema_version: 1',
      'services:',
      '  anp_service_endpoint: "https://rwiki.cn/anp-im/rpc"',
      '  anp_service_did: "did:wba:rwiki.cn"',
      '  ca_bundle: ""',
      'identity:',
      '  active: ""',
      'secret_storage:',
      '  mode: "vault_required"',
      '  vault_dir: ""',
      '  workspace_id: "dsh-awiki-e2e"',
      '  device_id: "cli-peer"',
      'runtime:',
      '  mode: "http"',
      '  socket_path: ""',
      '  listener:',
      '    enabled: false',
      '    auto_install: false',
      '    auto_start: false',
      '  host_notify:',
      '    enabled: false',
      '    sink: "log"',
      '    file_path: ""',
      '    openclaw:',
      '      hook_url: ""',
      '      token: ""',
      'output:',
      '  format: "json"',
      '  no_color: true',
      '',
    ].join('\n')
  }

  private environment(): NodeJS.ProcessEnv {
    const env: NodeJS.ProcessEnv = {
      HOME: this.state.home,
      AWIKI_CLI_WORKSPACE_HOME_DIR: this.state.workspace,
      AWIKI_IM_CORE_VAULT_ROOT_KEY_B64: this.state.vaultRootKey,
      AWIKI_CLI_UPDATE_CACHE_ONLY: '1',
      NO_COLOR: '1',
    }
    for (const key of ['PATH', 'LANG', 'LC_ALL', 'TMPDIR', 'SSL_CERT_FILE', 'SSL_CERT_DIR']) {
      if (process.env[key] !== undefined) env[key] = process.env[key]
    }
    return env
  }

  private run(args: readonly string[]): Promise<CliEnvelope> {
    return this.runWithStdin(args, undefined)
  }

  private runWithStdin(args: readonly string[], stdin: string | undefined): Promise<CliEnvelope> {
    return new Promise((resolveRun, rejectRun) => {
      const child = spawn(this.#binary, args, {
        cwd: this.state.root,
        env: this.environment(),
        stdio: ['pipe', 'pipe', 'pipe'],
      })
      let stdout = ''
      let stderr = ''
      let settled = false
      const rejectOnce = (error: Error) => {
        if (settled) return
        settled = true
        rejectRun(error)
      }
      child.stdout.on('data', chunk => {
        stdout += chunk.toString()
        if (Buffer.byteLength(stdout) > maximumOutputBytes) {
          child.kill('SIGTERM')
          rejectOnce(new Error('DSH E2E CLI output exceeded its safe limit'))
        }
      })
      child.stderr.on('data', chunk => {
        stderr += chunk.toString()
        if (Buffer.byteLength(stderr) > maximumOutputBytes) {
          child.kill('SIGTERM')
          rejectOnce(new Error('DSH E2E CLI stderr exceeded its safe limit'))
        }
      })
      child.once('error', () => rejectOnce(new Error('DSH E2E CLI command could not start')))
      child.once('exit', code => {
        if (settled) return
        if (code !== 0) {
          const code = safeFailureCode(stdout) === 'unknown' ? safeFailureCode(stderr) : safeFailureCode(stdout)
          rejectOnce(new Error(`DSH E2E CLI ${safeAction(args)} failed (${code})`))
          return
        }
        try {
          const payload = JSON.parse(stdout) as CliEnvelope
          if (payload.ok !== true) throw new Error('invalid')
          settled = true
          resolveRun(payload)
        } catch {
          rejectOnce(new Error('DSH E2E CLI command returned an invalid envelope'))
        }
      })
      child.stdin.end(stdin)
    })
  }
}
