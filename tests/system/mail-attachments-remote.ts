#!/usr/bin/env node
/** Audited two-direction remote runner for DSH AWiki mail attachments. */

import { createHash, randomUUID } from 'node:crypto'
import assert from 'node:assert/strict'
import { readFile, readdir, realpath, writeFile } from 'node:fs/promises'
import { createRequire } from 'node:module'
import { basename, dirname, join, resolve } from 'node:path'
import { parseArgs } from 'node:util'
import { Context } from '@deepseek-ai/cordis'
import AgentRegistry from '@deepseek-ai/dsh-agent'
import SystemPrompt from '@deepseek-ai/dsh-system-prompt'
import ToolRuntime from '@deepseek-ai/dsh-tools'
import ApprovalService from '@deepseek-ai/dsh-user-approval'
import { SettingsProvider, type SettingsNamespace } from '@deepseek-ai/dsh-settings'
import { openImCoreNodeClient, type ImCoreNodeClient } from '@awiki/im-core-node'
import AwikiService, { type AwikiResult } from '../../src/index.ts'
import { RustSdkAdapter } from '../../src/sdk-adapter.ts'
import {
  downloadAndSaveMailAttachment,
  downloadableMailAttachment,
} from '../../src/client/mail-attachment.ts'

const NAME = 'dsh-awiki-mail-attachments-remote'
const SCENARIO = 'dsh-awiki-mail-attachments'
const ONE_MIB = 1024 * 1024
const VERSION_FIELDS = [
  'mail_service_commit',
  'sdk_wrapper_version',
  'sdk_platform_package',
  'sdk_platform_version',
  'dsh_plugin_version',
  'dsh_source_ref',
  'desktop_profile_name',
  'desktop_plugin_version',
] as const

interface FixtureSpec {
  readonly path: string
  readonly file_name: string
  readonly content_type: string
  readonly size_bytes: number
  readonly sha256: string
}

class AcceptanceSettings extends SettingsProvider {
  override readonly writable = false

  protected load(): Promise<Record<string, unknown>> {
    return Promise.resolve({})
  }

  protected persist(_ns: SettingsNamespace, _section: Record<string, unknown>): Promise<void> {
    return Promise.reject(new Error('acceptance settings are read-only'))
  }
}

interface AcceptanceManifest {
  readonly schema_version: 1
  readonly scenario: typeof SCENARIO
  readonly case_ids: readonly string[]
  readonly required_checks: readonly string[]
  readonly fixtures: {
    readonly outbound: FixtureSpec
    readonly inbound: FixtureSpec
  }
  readonly report_version_fields: readonly string[]
}

interface VersionMatrix {
  readonly schema_version: 1
  readonly mail_service_commit: string
  readonly sdk_wrapper_version: string
  readonly sdk_platform_package: string
  readonly sdk_platform_version: string
  readonly dsh_plugin_version: string
  readonly dsh_source_ref: string
  readonly desktop_profile_name: string
  readonly desktop_plugin_version: string
}

interface ProviderCallCounters {
  sdkSendMailCalls: number
  sdkMailDownloadCalls: number
}

interface MailCleanupRecord {
  readonly owner: 'primary' | 'peer'
  readonly did: string
  readonly messageId: string
}

function required(name: string): string {
  const value = process.env[name]?.trim()
  if (value === undefined || value === '') throw new Error(`${NAME}: ${name} is required`)
  return value
}

function option(name: string, value: string | undefined): string {
  if (value === undefined || value.trim() === '') throw new Error(`${NAME}: --${name} is required`)
  return resolve(value)
}

function value<Value>(result: AwikiResult<Value>, operation: string): Value {
  if (!result.ok) throw new Error(`${NAME}: ${operation} failed with ${result.error.code}: ${result.error.message}`)
  return result.value
}

function digest(bytes: Uint8Array): string {
  return createHash('sha256').update(bytes).digest('hex')
}

function exactObject(value: unknown, keys: readonly string[], label: string): Record<string, unknown> {
  if (typeof value !== 'object' || value === null || Array.isArray(value)) {
    throw new Error(`${NAME}: ${label} must be an object`)
  }
  const object = value as Record<string, unknown>
  const actual = Object.keys(object).sort()
  const expected = [...keys].sort()
  if (JSON.stringify(actual) !== JSON.stringify(expected)) {
    throw new Error(`${NAME}: ${label} fields differ`)
  }
  return object
}

async function readManifest(path: string): Promise<AcceptanceManifest> {
  const raw = exactObject(JSON.parse(await readFile(path, 'utf8')), [
    'schema_version', 'scenario', 'case_ids', 'required_checks', 'fixtures',
    'report_version_fields', 'forbidden_report_keys',
  ], 'manifest')
  if (raw.schema_version !== 1 || raw.scenario !== SCENARIO) throw new Error(`${NAME}: manifest schema differs`)
  const fixtures = exactObject(raw.fixtures, ['outbound', 'inbound'], 'manifest fixtures')
  for (const direction of ['outbound', 'inbound'] as const) {
    const fixture = exactObject(fixtures[direction], [
      'path', 'file_name', 'content_type', 'size_bytes', 'sha256',
      ...direction === 'inbound' ? ['width', 'height'] : [],
    ], `${direction} fixture`)
    if (typeof fixture.file_name !== 'string'
      || typeof fixture.content_type !== 'string'
      || !Number.isSafeInteger(fixture.size_bytes)
      || typeof fixture.sha256 !== 'string') {
      throw new Error(`${NAME}: ${direction} fixture metadata differs`)
    }
  }
  if (!Array.isArray(raw.case_ids) || raw.case_ids.length !== 10
    || !Array.isArray(raw.required_checks) || raw.required_checks.length !== 10
    || !Array.isArray(raw.report_version_fields)
    || JSON.stringify([...raw.report_version_fields].sort()) !== JSON.stringify([...VERSION_FIELDS].sort())) {
    throw new Error(`${NAME}: manifest acceptance vocabulary differs`)
  }
  return raw as unknown as AcceptanceManifest
}

async function readVersionMatrix(path: string): Promise<VersionMatrix> {
  const raw = exactObject(JSON.parse(await readFile(path, 'utf8')), [
    'schema_version', ...VERSION_FIELDS,
  ], 'version matrix')
  if (raw.schema_version !== 1) throw new Error(`${NAME}: version matrix schema differs`)
  for (const field of VERSION_FIELDS) {
    if (typeof raw[field] !== 'string' || raw[field].trim() === '') {
      throw new Error(`${NAME}: version matrix ${field} is invalid`)
    }
  }
  return raw as unknown as VersionMatrix
}

async function waitForMailboxAccount(read: () => Promise<{ readonly mailboxAddress?: string }>): Promise<string> {
  const deadline = Date.now() + 60_000
  while (Date.now() < deadline) {
    const account = await read().catch(() => undefined)
    if (account?.mailboxAddress !== undefined && account.mailboxAddress.includes('@')) return account.mailboxAddress
    await new Promise(resolveDelay => setTimeout(resolveDelay, 1_000))
  }
  throw new Error(`${NAME}: mailbox account did not become ready`)
}

async function waitForMessage(
  read: () => Promise<readonly { readonly id: string; readonly subject: string }[]>,
  subject: string,
): Promise<string> {
  const deadline = Date.now() + 120_000
  while (Date.now() < deadline) {
    const items = await read()
    const matches = items.filter(item => item.subject === subject)
    if (matches.length > 1) throw new Error(`${NAME}: duplicate mail subject observation`)
    if (matches.length === 1) {
      await new Promise(resolveDelay => setTimeout(resolveDelay, 1_000))
      const stable = (await read()).filter(item => item.subject === subject)
      if (stable.length !== 1 || stable[0]?.id !== matches[0]?.id) {
        throw new Error(`${NAME}: mail subject observation was not stable and exact-one`)
      }
      return matches[0]!.id
    }
    await new Promise(resolveDelay => setTimeout(resolveDelay, 1_000))
  }
  throw new Error(`${NAME}: timed out waiting for mail observation`)
}

function openNativeClient(stateRoot: string): Promise<ImCoreNodeClient> {
  const messageServiceUrl = required('DSH_AWIKI_MESSAGE_SERVICE_URL')
  return openImCoreNodeClient({
    stateRoot,
    serviceBaseUrl: required('DSH_AWIKI_USER_SERVICE_URL'),
    didDomain: required('DSH_AWIKI_USER_SERVICE_DOMAIN'),
    userServiceEndpoint: required('DSH_AWIKI_USER_SERVICE_URL'),
    messageServiceEndpoint: messageServiceUrl,
    mailServiceEndpoint: required('DSH_AWIKI_MAIL_SERVICE_URL'),
    anpServiceEndpoint: messageServiceUrl,
    anpServiceDid: required('DSH_AWIKI_MESSAGE_SERVICE_DID'),
    multiDeviceHandleRecoveryEnabled: true,
    multiDeviceAudience: 'awiki-user-service',
  })
}

function countedClient(client: ImCoreNodeClient, counters: ProviderCallCounters): ImCoreNodeClient {
  return new Proxy(client, {
    get(target, property) {
      const member = Reflect.get(target, property, target)
      if (typeof member !== 'function') return member
      if (property === 'sendMail') {
        return (...arguments_: unknown[]) => {
          counters.sdkSendMailCalls += 1
          return Reflect.apply(member, target, arguments_)
        }
      }
      if (property === 'downloadMailAttachment') {
        return (...arguments_: unknown[]) => {
          counters.sdkMailDownloadCalls += 1
          return Reflect.apply(member, target, arguments_)
        }
      }
      return member.bind(target)
    },
  })
}

async function browserDownloadSave(
  primary: Context,
  localMessageId: string,
  expected: NonNullable<ReturnType<typeof downloadableMailAttachment>>,
  maxBytes: number,
): Promise<{
  readonly fileName: string
  readonly contentType: string
  readonly bytes: Uint8Array
  readonly hostDownload: {
    readonly fileName: string
    readonly contentType: string
    readonly sizeBytes: number
    readonly sha256: string
  }
}> {
  const createDescriptor = Object.getOwnPropertyDescriptor(URL, 'createObjectURL')
  const revokeDescriptor = Object.getOwnPropertyDescriptor(URL, 'revokeObjectURL')
  const documentDescriptor = Object.getOwnPropertyDescriptor(globalThis, 'document')
  let savedBlob: Blob | undefined
  let hostDownload: {
    readonly fileName: string
    readonly contentType: string
    readonly sizeBytes: number
    readonly sha256: string
  } | undefined
  let savedFileName = ''
  let clicked = 0
  let revoked = ''
  const anchor = {
    href: '',
    download: '',
    hidden: false,
    click() {
      clicked += 1
      savedFileName = this.download
    },
    remove() {},
  }
  Object.defineProperty(URL, 'createObjectURL', {
    configurable: true,
    value: (blob: Blob) => {
      savedBlob = blob
      return 'blob:dsh-awiki-mail-attachment-system'
    },
  })
  Object.defineProperty(URL, 'revokeObjectURL', {
    configurable: true,
    value: (url: string) => { revoked = url },
  })
  Object.defineProperty(globalThis, 'document', {
    configurable: true,
    value: {
      createElement: (tag: string) => {
        if (tag !== 'a') throw new Error(`${NAME}: Browser save created an unexpected element`)
        return anchor
      },
      body: { append: (value: unknown) => {
        if (value !== anchor) throw new Error(`${NAME}: Browser save appended an unexpected element`)
      } },
    },
  })
  try {
    const saved = await downloadAndSaveMailAttachment(
      async request => {
        const result = await primary.awiki.downloadMailAttachment(request)
        if (result.ok) {
          hostDownload = {
            fileName: result.value.fileName,
            contentType: result.value.contentType,
            sizeBytes: result.value.sizeBytes,
            sha256: result.value.sha256,
          }
        }
        return result.ok
          ? { ok: true as const, value: result.value }
          : { ok: false as const, error: result.error.message }
      },
      { localMessageId: localMessageId as never, attachmentIndex: expected.index },
      expected,
      maxBytes,
    )
    if (!saved || savedBlob === undefined || hostDownload === undefined || clicked !== 1
      || revoked !== 'blob:dsh-awiki-mail-attachment-system'
      || savedFileName !== expected.fileName) {
      throw new Error(`${NAME}: Browser Blob/save lifecycle differs`)
    }
    return {
      fileName: savedFileName,
      contentType: savedBlob.type,
      bytes: new Uint8Array(await savedBlob.arrayBuffer()),
      hostDownload,
    }
  } finally {
    if (createDescriptor === undefined) delete (URL as unknown as { createObjectURL?: unknown }).createObjectURL
    else Object.defineProperty(URL, 'createObjectURL', createDescriptor)
    if (revokeDescriptor === undefined) delete (URL as unknown as { revokeObjectURL?: unknown }).revokeObjectURL
    else Object.defineProperty(URL, 'revokeObjectURL', revokeDescriptor)
    if (documentDescriptor === undefined) delete (globalThis as unknown as { document?: unknown }).document
    else Object.defineProperty(globalThis, 'document', documentDescriptor)
  }
}

async function mountPrimary(stateRoot: string, counters: ProviderCallCounters): Promise<Context> {
  const ctx = new Context()
  await ctx.plugin(AgentRegistry)
  await ctx.plugin(SystemPrompt)
  await ctx.plugin(ToolRuntime)
  await ctx.plugin(ApprovalService)
  await ctx.plugin(AcceptanceSettings)
  await ctx.plugin(AwikiService, {
    userServiceUrl: required('DSH_AWIKI_USER_SERVICE_URL'),
    userServiceDomain: required('DSH_AWIKI_USER_SERVICE_DOMAIN'),
    messageServiceUrl: required('DSH_AWIKI_MESSAGE_SERVICE_URL'),
    messageServicePublicUrl: required('DSH_AWIKI_MESSAGE_SERVICE_PUBLIC_URL'),
    messageServiceDid: required('DSH_AWIKI_MESSAGE_SERVICE_DID'),
    mailServiceUrl: required('DSH_AWIKI_MAIL_SERVICE_URL'),
    stateRoot,
    mailAttachmentMaxCount: 10,
    mailAttachmentMaxBytes: 10 * ONE_MIB,
    mailAttachmentTotalMaxBytes: 18 * ONE_MIB,
  })
  ctx.effect(
    () => ctx.awiki.registerClientFactory(options => new RustSdkAdapter(
      openNativeClient(options.stateRoot).then(client => countedClient(client, counters)),
    )),
    'counted AWiki Rust SDK client',
  )
  return ctx
}

async function openPeer(): Promise<ImCoreNodeClient> {
  return openNativeClient(required('DSH_AWIKI_PEER_STATE_ROOT'))
}

async function writeCleanup(
  path: string,
  dids: readonly string[],
  createdMailCount: number,
  trackedMailRecordCount: number,
  records: readonly MailCleanupRecord[],
  cleanupStatus: 'pending' | 'cleaned',
): Promise<void> {
  await writeFile(path, `${JSON.stringify({
    schema_version: 3,
    scenario: SCENARIO,
    dids,
    created_mail_count: createdMailCount,
    tracked_mail_record_count: trackedMailRecordCount,
    mail_records: records.map(record => ({
      did: record.did,
      message_id: record.messageId,
    })),
    cleanup_status: cleanupStatus,
  }, undefined, 2)}\n`, { encoding: 'utf8', mode: 0o600 })
}

function mailRpcRequest(method: string, params: Record<string, unknown>): Request {
  return new Request(`${required('DSH_AWIKI_MAIL_SERVICE_URL').replace(/\/$/u, '')}/mail/rpc`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ jsonrpc: '2.0', id: 'mail-attachment-cleanup', method, params }),
  })
}

function softDeleteMessagesRequest(messageIds: readonly string[]): Request {
  return mailRpcRequest('mail.deleteMessages', {
    message_ids: messageIds,
  })
}

async function peerAuthenticatedFetch(client: ImCoreNodeClient, request: Request): Promise<Response> {
  const body = new Uint8Array(await request.clone().arrayBuffer())
  let attempt = await client.prepareExternalHttpRequest({
    url: request.url,
    method: request.method,
    headers: [...request.headers].map(([name, value]) => ({ name, value })),
    body,
  })
  for (let retry = 0; retry <= 1; retry += 1) {
    const headers = new Headers(request.headers)
    for (const header of attempt.headerPatch) headers.set(header.name, header.value)
    const response = await fetch(attempt.targetUrl, {
      method: attempt.method,
      headers,
      body: Uint8Array.from(body),
      redirect: 'manual',
    })
    const next = await attempt.handleResponse({
      statusCode: response.status,
      headers: ['authentication-info', 'www-authenticate', 'accept-signature']
        .map(name => ({ name, value: response.headers.get(name) }))
        .filter((header): header is { readonly name: string; readonly value: string } => header.value !== null),
    }).catch(() => null)
    if (next === null) return response
    attempt = next
  }
  throw new Error(`${NAME}: mail cleanup authentication retried more than once`)
}

async function verifiedDeleteResponse(response: Response, expected: number): Promise<void> {
  if (!response.ok) throw new Error(`${NAME}: mail cleanup transport was rejected`)
  const raw = exactObject(await response.json(), ['jsonrpc', 'id', 'result'], 'mail cleanup response')
  const result = exactObject(raw.result, ['deleted'], 'mail cleanup result')
  if (raw.jsonrpc !== '2.0' || raw.id !== 'mail-attachment-cleanup' || result.deleted !== expected) {
    throw new Error(`${NAME}: mail cleanup result differs`)
  }
}

type CleanupDispatch = (
  owner: MailCleanupRecord['owner'],
  request: Request,
) => Promise<Response | undefined>

interface CleanupClosureObservation {
  readonly readErrorCode: string | undefined
  readonly downloadErrorCode: string | undefined
  readonly inboxContainsMessage: boolean
  readonly sentContainsMessage: boolean
}

type CleanupClosureProbe = (
  owner: MailCleanupRecord['owner'],
  record: MailCleanupRecord,
) => Promise<CleanupClosureObservation>

async function productionCleanupDispatch(
  primary: Context | undefined,
  peer: ImCoreNodeClient | undefined,
  owner: MailCleanupRecord['owner'],
  request: Request,
): Promise<Response | undefined> {
  return owner === 'primary'
    ? primary?.awiki.externalHttpAuth.dispatch(request, fetch)
    : peer === undefined ? undefined : peerAuthenticatedFetch(peer, request)
}

async function mailboxContainsMessage(
  messageId: string,
  folder: 'inbox' | 'sent',
  readPage: (offset: number) => Promise<{
    readonly items: readonly { readonly id: string }[]
    readonly nextOffset?: number
    readonly hasMore: boolean
  }>,
): Promise<boolean> {
  let offset = 0
  for (let pageIndex = 0; pageIndex < 100; pageIndex += 1) {
    const page = await readPage(offset)
    if (page.items.some(item => item.id === messageId)) return true
    if (!page.hasMore) return false
    if (!Number.isSafeInteger(page.nextOffset) || page.nextOffset! <= offset) {
      throw new Error(`${NAME}: ${folder} cleanup closure pagination differs`)
    }
    offset = page.nextOffset!
  }
  throw new Error(`${NAME}: ${folder} cleanup closure pagination exceeded its bound`)
}

async function nodeFailureCode(operation: () => Promise<unknown>): Promise<string | undefined> {
  try {
    await operation()
    return undefined
  } catch (error) {
    return typeof error === 'object' && error !== null && 'code' in error
      && typeof error.code === 'string' ? error.code : ''
  }
}

async function productionCleanupClosureProbe(
  primary: Context | undefined,
  peer: ImCoreNodeClient | undefined,
  owner: MailCleanupRecord['owner'],
  record: MailCleanupRecord,
): Promise<CleanupClosureObservation> {
  if (owner === 'primary') {
    if (primary === undefined) throw new Error(`${NAME}: primary cleanup closure owner is unavailable`)
    const read = await primary.awiki.readMail({ messageId: record.messageId as never })
    const download = await primary.awiki.downloadMailAttachment({
      localMessageId: record.messageId as never,
      attachmentIndex: 0,
    })
    const readFolder = (folder: 'inbox' | 'sent') => mailboxContainsMessage(
      record.messageId,
      folder,
      async offset => value(
        await primary.awiki.listMailInbox({ folder, limit: 100, offset }),
        `probe primary ${folder} after cleanup`,
      ),
    )
    return {
      readErrorCode: read.ok ? undefined : read.error.code,
      downloadErrorCode: download.ok ? undefined : download.error.code,
      inboxContainsMessage: await readFolder('inbox'),
      sentContainsMessage: await readFolder('sent'),
    }
  }
  if (peer === undefined) throw new Error(`${NAME}: peer cleanup closure owner is unavailable`)
  const readFolder = (folder: 'inbox' | 'sent') => mailboxContainsMessage(
    record.messageId,
    folder,
    offset => peer.listMailInbox({ folder, limit: 100, offset }),
  )
  return {
    readErrorCode: await nodeFailureCode(() => peer.readMail(record.messageId)),
    downloadErrorCode: await nodeFailureCode(() => peer.downloadMailAttachment({
      messageId: record.messageId,
      attachmentIndex: 0,
    })),
    inboxContainsMessage: await readFolder('inbox'),
    sentContainsMessage: await readFolder('sent'),
  }
}

function verifyCleanupClosure(
  owner: MailCleanupRecord['owner'],
  observation: CleanupClosureObservation,
): void {
  const expectedErrorCode = owner === 'primary' ? 'remote' : 'service_error'
  if (observation.readErrorCode !== expectedErrorCode
    || observation.downloadErrorCode !== expectedErrorCode
    || observation.inboxContainsMessage
    || observation.sentContainsMessage) {
    throw new Error(`${NAME}: mail cleanup active-access closure differs`)
  }
}

async function cleanupMailRecords(
  primary: Context | undefined,
  peer: ImCoreNodeClient | undefined,
  records: MailCleanupRecord[],
  dispatch: CleanupDispatch = (owner, request) => productionCleanupDispatch(
    primary,
    peer,
    owner,
    request,
  ),
  probe: CleanupClosureProbe = (owner, record) => productionCleanupClosureProbe(
    primary,
    peer,
    owner,
    record,
  ),
): Promise<void> {
  for (const owner of ['primary', 'peer'] as const) {
    const owned = records.filter(record => record.owner === owner)
    if (owned.length === 0) continue
    const request = softDeleteMessagesRequest(owned.map(record => record.messageId))
    const response = await dispatch(owner, request)
    if (response === undefined) throw new Error(`${NAME}: mail cleanup owner is unavailable`)
    await verifiedDeleteResponse(response, owned.length)
    for (const record of owned) {
      verifyCleanupClosure(owner, await probe(owner, record))
    }
    // These are active-accessible residuals. A successful public soft delete
    // removes them from the tracker without claiming physical row deletion.
    const deleted = new Set(owned.map(record => `${record.owner}\0${record.messageId}`))
    records.splice(0, records.length, ...records.filter(
      record => !deleted.has(`${record.owner}\0${record.messageId}`),
    ))
  }
}

async function settleCleanup(
  primary: Context | undefined,
  peer: ImCoreNodeClient | undefined,
  records: MailCleanupRecord[],
  writeStatus: (status: 'pending' | 'cleaned') => Promise<void>,
  dispatch?: CleanupDispatch,
  probe?: CleanupClosureProbe,
): Promise<boolean> {
  let cleanupConfirmed = false
  try {
    await cleanupMailRecords(primary, peer, records, dispatch, probe)
    cleanupConfirmed = records.length === 0
  } catch {}
  await writeStatus(cleanupConfirmed ? 'cleaned' : 'pending').catch(() => undefined)
  return cleanupConfirmed
}

function cleanupRpcResponse(deleted: unknown): Response {
  return new Response(JSON.stringify({
    jsonrpc: '2.0',
    id: 'mail-attachment-cleanup',
    result: { deleted },
  }), {
    status: 200,
    headers: { 'content-type': 'application/json' },
  })
}

async function runCleanupContractTests(): Promise<void> {
  const did = 'did:wba:contract.test:user:cleanup'
  const cleanedRecords: MailCleanupRecord[] = [
    { owner: 'primary', did, messageId: 'message-1' },
    { owner: 'primary', did, messageId: 'message-2' },
  ]
  await cleanupMailRecords(
    undefined,
    undefined,
    cleanedRecords,
    async (owner, request) => {
      assert.equal(owner, 'primary')
      const rpc = exactObject(JSON.parse(await request.text()), ['jsonrpc', 'id', 'method', 'params'], 'contract cleanup request')
      const params = exactObject(rpc.params, ['message_ids'], 'contract cleanup params')
      assert.equal(rpc.method, 'mail.deleteMessages')
      assert.deepEqual(params.message_ids, ['message-1', 'message-2'])
      assert.notEqual(params.permanent, true)
      return cleanupRpcResponse(2)
    },
    async owner => ({
      readErrorCode: owner === 'primary' ? 'remote' : 'service_error',
      downloadErrorCode: owner === 'primary' ? 'remote' : 'service_error',
      inboxContainsMessage: false,
      sentContainsMessage: false,
    }),
  )
  assert.equal(cleanedRecords.length, 0)

  const peerCleanedRecords: MailCleanupRecord[] = [
    { owner: 'peer', did, messageId: 'message-peer' },
  ]
  await cleanupMailRecords(
    undefined,
    undefined,
    peerCleanedRecords,
    async () => cleanupRpcResponse(1),
    async () => ({
      readErrorCode: 'service_error',
      downloadErrorCode: 'service_error',
      inboxContainsMessage: false,
      sentContainsMessage: false,
    }),
  )
  assert.equal(peerCleanedRecords.length, 0)

  const countMismatchRecords: MailCleanupRecord[] = [
    { owner: 'peer', did, messageId: 'message-3' },
  ]
  await assert.rejects(
    cleanupMailRecords(
      undefined,
      undefined,
      countMismatchRecords,
      async () => cleanupRpcResponse(0),
      async () => { throw new Error('closure probe must not run after count mismatch') },
    ),
    new RegExp(`${NAME}: mail cleanup result differs`, 'u'),
  )
  assert.deepEqual(countMismatchRecords.map(record => record.messageId), ['message-3'])

  const failedRecords: MailCleanupRecord[] = [
    { owner: 'primary', did, messageId: 'message-4' },
  ]
  let finalStatus: 'pending' | 'cleaned' | undefined
  const cleanupConfirmed = await settleCleanup(
    undefined,
    undefined,
    failedRecords,
    async status => { finalStatus = status },
    async () => { throw new Error('synthetic cleanup failure') },
    async () => { throw new Error('closure probe must not run after delete failure') },
  )
  assert.equal(cleanupConfirmed, false)
  assert.equal(finalStatus, 'pending')
  assert.deepEqual(failedRecords.map(record => record.messageId), ['message-4'])

  const closureCases: readonly CleanupClosureObservation[] = [
    {
      readErrorCode: undefined,
      downloadErrorCode: 'remote',
      inboxContainsMessage: false,
      sentContainsMessage: false,
    },
    {
      readErrorCode: 'remote',
      downloadErrorCode: undefined,
      inboxContainsMessage: false,
      sentContainsMessage: false,
    },
    {
      readErrorCode: 'remote',
      downloadErrorCode: 'remote',
      inboxContainsMessage: true,
      sentContainsMessage: false,
    },
    {
      readErrorCode: 'remote',
      downloadErrorCode: 'remote',
      inboxContainsMessage: false,
      sentContainsMessage: true,
    },
  ]
  for (const [index, observation] of closureCases.entries()) {
    const residual: MailCleanupRecord[] = [
      { owner: 'primary', did, messageId: `closure-visible-${index}` },
    ]
    await assert.rejects(
      cleanupMailRecords(
        undefined,
        undefined,
        residual,
        async () => cleanupRpcResponse(1),
        async () => observation,
      ),
      new RegExp(`${NAME}: mail cleanup active-access closure differs`, 'u'),
    )
    assert.equal(residual.length, 1)
  }
  const visibleResidual: MailCleanupRecord[] = [
    { owner: 'primary', did, messageId: 'closure-finally-visible' },
  ]
  let visibleFinalStatus: 'pending' | 'cleaned' | undefined
  const visibleCleanupConfirmed = await settleCleanup(
    undefined,
    undefined,
    visibleResidual,
    async status => { visibleFinalStatus = status },
    async () => cleanupRpcResponse(1),
    async () => closureCases[0]!,
  )
  assert.equal(visibleCleanupConfirmed, false)
  assert.equal(visibleFinalStatus, 'pending')
  assert.equal(visibleResidual.length, 1)
  process.stdout.write('mail cleanup contract tests passed\n')
}

async function readPackage(path: string): Promise<{ readonly name: string; readonly version: string }> {
  const parsed: unknown = JSON.parse(await readFile(path, 'utf8'))
  if (typeof parsed !== 'object' || parsed === null || Array.isArray(parsed)) {
    throw new Error(`${NAME}: package metadata must be an object`)
  }
  const raw = parsed as Record<string, unknown>
  if (typeof raw.name !== 'string' || typeof raw.version !== 'string') throw new Error(`${NAME}: package metadata differs`)
  return { name: raw.name, version: raw.version }
}

async function nearestPackage(entry: string): Promise<{ readonly name: string; readonly version: string }> {
  let current = dirname(entry)
  for (;;) {
    const path = join(current, 'package.json')
    try {
      const raw = JSON.parse(await readFile(path, 'utf8')) as { readonly name?: unknown; readonly version?: unknown }
      if (typeof raw.name === 'string' && typeof raw.version === 'string') {
        return { name: raw.name, version: raw.version }
      }
    } catch {}
    const parent = dirname(current)
    if (parent === current) throw new Error(`${NAME}: cannot locate package metadata`)
    current = parent
  }
}

interface RuntimeReadback {
  readonly versions: Omit<VersionMatrix, 'schema_version'>
  readonly nativeAddonPackage: string
  readonly desktopPackagePathSuffix: string
  readonly desktopPackageName: string
}

async function runtimeVersions(expected: VersionMatrix): Promise<RuntimeReadback> {
  const mailHealthResponse = await fetch(`${required('DSH_AWIKI_MAIL_SERVICE_URL').replace(/\/$/u, '')}/mail/health`)
  if (!mailHealthResponse.ok) throw new Error(`${NAME}: Mail Service health read-back failed`)
  const mailHealth = exactObject(await mailHealthResponse.json(), ['status', 'service', 'release_commit'], 'Mail Service health')
  if (mailHealth.status !== 'healthy' || mailHealth.service !== 'awiki-mail-service'
    || typeof mailHealth.release_commit !== 'string') {
    throw new Error(`${NAME}: Mail Service health provenance differs`)
  }
  const pluginPackage = await readPackage(resolve('package.json'))
  const require = createRequire(import.meta.url)
  const wrapperPackage = await nearestPackage(require.resolve('@awiki/im-core-node'))
  const platformPackageName = `@awiki/im-core-node-${process.platform}-${process.arch}${process.platform === 'linux' ? '-gnu' : process.platform === 'win32' ? '-msvc' : ''}`
  const platformPackage = await nearestPackage(require.resolve(platformPackageName))
  const desktopProfileRoot = await realpath(resolve(required('DSH_AWIKI_DESKTOP_PROFILE_ROOT')))
  const desktopPackagePath = await realpath(resolve(required('DSH_AWIKI_DESKTOP_PLUGIN_PACKAGE_JSON')))
  const expectedDesktopPackagePath = await realpath(join(
    desktopProfileRoot,
    'node_modules',
    '@awiki',
    'dsh-plugin',
    'package.json',
  ))
  if (desktopPackagePath !== expectedDesktopPackagePath
    || basename(desktopProfileRoot) !== expected.desktop_profile_name) {
    throw new Error(`${NAME}: Desktop profile package provenance differs`)
  }
  const desktopPackage = await readPackage(desktopPackagePath)
  const desktopPackagePathSuffix = desktopPackagePath.slice(`${desktopProfileRoot}/`.length)
  if (pluginPackage.name !== '@awiki/dsh-plugin' || wrapperPackage.name !== '@awiki/im-core-node'
    || platformPackage.name !== platformPackageName || desktopPackage.name !== '@awiki/dsh-plugin') {
    throw new Error(`${NAME}: package identity read-back differs`)
  }
  const actual = {
    mail_service_commit: mailHealth.release_commit,
    sdk_wrapper_version: wrapperPackage.version,
    sdk_platform_package: platformPackage.name,
    sdk_platform_version: platformPackage.version,
    dsh_plugin_version: pluginPackage.version,
    dsh_source_ref: expected.dsh_source_ref,
    desktop_profile_name: basename(desktopProfileRoot),
    desktop_plugin_version: desktopPackage.version,
  }
  for (const field of VERSION_FIELDS) {
    if (actual[field] !== expected[field]) throw new Error(`${NAME}: runtime version ${field} differs`)
  }
  return {
    versions: actual,
    nativeAddonPackage: platformPackage.name,
    desktopPackagePathSuffix,
    desktopPackageName: desktopPackage.name,
  }
}

async function sentStoreFixtureByteMatchCount(stateRoot: string, attachment: Uint8Array): Promise<number> {
  const directory = join(stateRoot, '.host', 'sent-mail-v2')
  const encoded = Buffer.from(attachment).toString('base64')
  const files = await readdir(directory).catch(() => [])
  let matches = 0
  for (const file of files) {
    const content = await readFile(join(directory, file), 'utf8')
    if (content.includes(encoded)) matches += 1
  }
  return matches
}

async function pluginManagerReadback(expected: VersionMatrix): Promise<{
  readonly profileName: string
  readonly packageName: string
  readonly packageVersion: string
  readonly loadCount: number
}> {
  const receiptPath = await realpath(resolve(required('DSH_AWIKI_DESKTOP_PLUGIN_MANAGER_RECEIPT')))
  const raw = exactObject(JSON.parse(await readFile(receiptPath, 'utf8')), [
    'schema_version', 'profile_name', 'package_name', 'package_version',
    'plugin_list_exit_code', 'profile_boot_exit_code', 'plugin_load_count',
  ], 'Desktop plugin-manager receipt')
  if (raw.schema_version !== 1
    || raw.profile_name !== expected.desktop_profile_name
    || raw.package_name !== '@awiki/dsh-plugin'
    || raw.package_version !== expected.desktop_plugin_version
    || raw.plugin_list_exit_code !== 0
    || raw.profile_boot_exit_code !== 0
    || raw.plugin_load_count !== 1) {
    throw new Error(`${NAME}: Desktop plugin-manager receipt differs`)
  }
  return {
    profileName: raw.profile_name as string,
    packageName: raw.package_name as string,
    packageVersion: raw.package_version as string,
    loadCount: raw.plugin_load_count as number,
  }
}

const { values } = parseArgs({
  options: {
    manifest: { type: 'string' },
    outbound: { type: 'string' },
    inbound: { type: 'string' },
    versions: { type: 'string' },
    report: { type: 'string' },
    cleanup: { type: 'string' },
    'contract-test': { type: 'boolean' },
  },
  strict: true,
})

async function main(): Promise<void> {
  const manifestPath = option('manifest', values.manifest)
  const outboundPath = option('outbound', values.outbound)
  const inboundPath = option('inbound', values.inbound)
  const versionsPath = option('versions', values.versions)
  const reportPath = option('report', values.report)
  const cleanupPath = option('cleanup', values.cleanup)
  const manifest = await readManifest(manifestPath)
  const expectedVersions = await readVersionMatrix(versionsPath)
  const outbound = Uint8Array.from(await readFile(outboundPath))
  const inbound = Uint8Array.from(await readFile(inboundPath))
  for (const [direction, bytes, path, fixture] of [
    ['outbound', outbound, outboundPath, manifest.fixtures.outbound],
    ['inbound', inbound, inboundPath, manifest.fixtures.inbound],
  ] as const) {
    if (resolve(path) !== resolve(dirname(manifestPath), fixture.path)
      || bytes.byteLength !== fixture.size_bytes || digest(bytes) !== fixture.sha256) {
      throw new Error(`${NAME}: ${direction} fixture differs from the manifest`)
    }
  }

  let primary: Context | undefined
  let peer: ImCoreNodeClient | undefined
  const dids: string[] = []
  const mailRecords: MailCleanupRecord[] = []
  let cleanupConfirmed = false
  let trackedMailRecordCount = 0
  const providerCalls: ProviderCallCounters = { sdkSendMailCalls: 0, sdkMailDownloadCalls: 0 }
  let mailMessageCount = 0
  try {
    primary = await mountPrimary(required('DSH_AWIKI_PRIMARY_STATE_ROOT'), providerCalls)
    const primaryExisting = value(await primary.awiki.getIdentity(), 'read primary identity')
    if (primaryExisting !== null) throw new Error(`${NAME}: primary state must start empty`)
    value(await primary.awiki.sendRegistrationOtp({
      handle: required('DSH_AWIKI_PRIMARY_HANDLE'),
      phone: required('DSH_AWIKI_PRIMARY_PHONE'),
    }), 'request primary registration OTP')
    const primaryIdentity = value(await primary.awiki.registerIdentity({
      handle: required('DSH_AWIKI_PRIMARY_HANDLE'),
      phone: required('DSH_AWIKI_PRIMARY_PHONE'),
      otp: required('DSH_AWIKI_PRIMARY_OTP'),
    }), 'register primary identity')
    dids.push(primaryIdentity.did)
    await writeCleanup(cleanupPath, dids, mailMessageCount, trackedMailRecordCount, mailRecords, 'pending')

    peer = await openPeer()
    if (await peer.getDefaultIdentity() !== null) throw new Error(`${NAME}: peer state must start empty`)
    await peer.requestRegistrationOtp({
      handle: required('DSH_AWIKI_PEER_HANDLE'),
      phone: required('DSH_AWIKI_PEER_PHONE'),
    })
    const peerIdentity = await peer.completeRegistration({
      handle: required('DSH_AWIKI_PEER_HANDLE'),
      phone: required('DSH_AWIKI_PEER_PHONE'),
      otp: required('DSH_AWIKI_PEER_OTP'),
    })
    dids.push(peerIdentity.did)
    await writeCleanup(cleanupPath, dids, mailMessageCount, trackedMailRecordCount, mailRecords, 'pending')

    const peerMail = peer
    const primaryAddress = await waitForMailboxAccount(async () => value(
      await primary!.awiki.getMailAccount(), 'read primary mailbox',
    ))
    const peerAddress = await waitForMailboxAccount(() => peer!.getMailAccount())
    const outboundSubject = `DSH mail outbound ${randomUUID()}`
    const inboundSubject = `DSH mail inbound ${randomUUID()}`

    const sentBefore = value(await primary.awiki.listMailInbox({ folder: 'sent', limit: 100 }), 'list sent before')
    const outboundResult = value(await primary.awiki.sendMail({
      to: [peerAddress],
      cc: [],
      subject: outboundSubject,
      bodyText: 'DSH AWiki outbound attachment acceptance.',
      attachments: [{
        fileName: manifest.fixtures.outbound.file_name,
        contentType: manifest.fixtures.outbound.content_type,
        sizeBytes: outbound.byteLength,
        bytesBase64: Buffer.from(outbound).toString('base64'),
      }],
    }), 'send outbound TXT')
    if (!outboundResult.accepted || outboundResult.messageId === undefined) {
      throw new Error(`${NAME}: outbound TXT was not accepted with a cleanup identifier`)
    }
    mailMessageCount += 1
    mailRecords.push({ owner: 'primary', did: primaryIdentity.did, messageId: outboundResult.messageId })
    trackedMailRecordCount += 1
    await writeCleanup(cleanupPath, dids, mailMessageCount, trackedMailRecordCount, mailRecords, 'pending')

    const peerOutboundId = await waitForMessage(
      async () => (await peer!.listMailInbox({ folder: 'inbox', limit: 100 })).items,
      outboundSubject,
    )
    const outboundRecipientRecordCount = (await peer.listMailInbox({ folder: 'inbox', limit: 100 })).items
      .filter(item => item.subject === outboundSubject).length
    mailRecords.push({ owner: 'peer', did: peerIdentity.did, messageId: peerOutboundId })
    trackedMailRecordCount += 1
    await writeCleanup(cleanupPath, dids, mailMessageCount, trackedMailRecordCount, mailRecords, 'pending')
    const peerOutbound = await peer.readMail(peerOutboundId)
    const peerOutboundMetadata = peerOutbound.attachments[0]
    if (peerOutbound.attachments.length !== 1 || peerOutboundMetadata === undefined
      || peerOutboundMetadata.index !== 0
      || peerOutboundMetadata.fileName !== manifest.fixtures.outbound.file_name
      || peerOutboundMetadata.contentType !== manifest.fixtures.outbound.content_type
      || peerOutboundMetadata.sizeBytes !== String(outbound.byteLength)) {
      throw new Error(`${NAME}: outbound TXT metadata differs`)
    }
    const peerOutboundDownload = await peerMail.downloadMailAttachment({
      messageId: peerOutboundId,
      attachmentIndex: 0,
    })
    if (peerOutboundDownload.fileName !== manifest.fixtures.outbound.file_name
      || peerOutboundDownload.contentType !== manifest.fixtures.outbound.content_type
      || peerOutboundDownload.sizeBytes !== String(outbound.byteLength)
      || digest(peerOutboundDownload.bytes) !== manifest.fixtures.outbound.sha256) {
      throw new Error(`${NAME}: outbound TXT bytes differ`)
    }

    const inboundResult = await peerMail.sendMail({
      to: [primaryAddress],
      subject: inboundSubject,
      bodyText: 'SDK peer inbound attachment acceptance.',
      attachments: [{
        fileName: manifest.fixtures.inbound.file_name,
        contentType: manifest.fixtures.inbound.content_type,
        bytes: inbound,
      }],
    })
    if (!inboundResult.accepted || inboundResult.messageId === undefined) {
      throw new Error(`${NAME}: inbound PNG was not accepted with a cleanup identifier`)
    }
    mailMessageCount += 1
    mailRecords.push({ owner: 'peer', did: peerIdentity.did, messageId: inboundResult.messageId })
    trackedMailRecordCount += 1
    await writeCleanup(cleanupPath, dids, mailMessageCount, trackedMailRecordCount, mailRecords, 'pending')

    const primaryInboundId = await waitForMessage(
      async () => value(
        await primary!.awiki.listMailInbox({ folder: 'inbox', limit: 100 }),
        'list primary inbox',
      ).items,
      inboundSubject,
    )
    const inboundRecipientRecordCount = value(
      await primary.awiki.listMailInbox({ folder: 'inbox', limit: 100 }),
      'count primary inbound record',
    ).items.filter(item => item.subject === inboundSubject).length
    const inboundSenderRecordCount = (await peer.listMailInbox({ folder: 'sent', limit: 100 })).items
      .filter(item => item.subject === inboundSubject).length
    mailRecords.push({ owner: 'primary', did: primaryIdentity.did, messageId: primaryInboundId })
    trackedMailRecordCount += 1
    await writeCleanup(cleanupPath, dids, mailMessageCount, trackedMailRecordCount, mailRecords, 'pending')
    const primaryInbound = value(await primary.awiki.readMail({ messageId: primaryInboundId as never }), 'read inbound PNG')
    const inboundMetadata = primaryInbound.attachments[0]
    if (primaryInbound.attachments.length !== 1 || inboundMetadata === undefined) {
      throw new Error(`${NAME}: inbound PNG metadata is missing`)
    }
    const downloadable = downloadableMailAttachment(inboundMetadata, 10 * ONE_MIB)
    if (downloadable === undefined) throw new Error(`${NAME}: inbound PNG is not browser-downloadable`)
    const sdkDownloadsBeforeBrowser = providerCalls.sdkMailDownloadCalls
    const browserSave = await browserDownloadSave(
      primary,
      primaryInbound.summary.id,
      downloadable,
      10 * ONE_MIB,
    )
    if (providerCalls.sdkMailDownloadCalls !== sdkDownloadsBeforeBrowser + 1
      || browserSave.fileName !== manifest.fixtures.inbound.file_name
      || browserSave.contentType !== manifest.fixtures.inbound.content_type
      || digest(browserSave.bytes) !== manifest.fixtures.inbound.sha256) {
      throw new Error(`${NAME}: inbound PNG Browser Blob/save bytes differ`)
    }

    let crossMailboxErrorCode = ''
    try {
      await peerMail.downloadMailAttachment({ messageId: primaryInboundId, attachmentIndex: 0 })
    } catch (error) {
      crossMailboxErrorCode = typeof error === 'object' && error !== null && 'code' in error
        && typeof error.code === 'string' ? error.code : ''
    }
    if (crossMailboxErrorCode !== 'service_error') {
      throw new Error(`${NAME}: cross-mailbox rejection code differs`)
    }

    const historyBeforeFailures = value(
      await primary.awiki.listMailInbox({ folder: 'sent', limit: 100 }),
      'list sent before failures',
    )
    const sdkSendCallsBeforeFailures = providerCalls.sdkSendMailCalls
    const invalidSubject = `invalid ${randomUUID()}`
    const oversizedSubject = `oversized ${randomUUID()}`
    const aggregateLimitSubject = `aggregate-limit ${randomUUID()}`
    const invalidBase64 = await primary.awiki.sendMail({
      to: [peerAddress], cc: [], subject: invalidSubject, bodyText: 'invalid',
      attachments: [{ fileName: 'invalid.bin', contentType: 'application/octet-stream', sizeBytes: 1, bytesBase64: 'AB==' }],
    })
    if (invalidBase64.ok || invalidBase64.error.code !== 'invalid-request') {
      throw new Error(`${NAME}: non-canonical Base64 did not fail closed`)
    }
    const oversized = await primary.awiki.sendMail({
      to: [peerAddress], cc: [], subject: oversizedSubject, bodyText: 'oversized',
      attachments: [{ fileName: 'oversized.bin', contentType: 'application/octet-stream', sizeBytes: 10 * ONE_MIB + 1, bytesBase64: '' }],
    })
    if (oversized.ok || oversized.error.code !== 'invalid-request') {
      throw new Error(`${NAME}: oversized attachment did not fail closed`)
    }
    const aggregateLimitResult = await primary.awiki.sendMail({
      to: [peerAddress], cc: [], subject: aggregateLimitSubject, bodyText: 'aggregate limit',
      attachments: [10, 9].map((size, index) => {
        const bytes = Buffer.alloc(size * ONE_MIB, index + 1)
        return {
          fileName: `aggregate-limit-${index}.bin`,
          contentType: 'application/octet-stream',
          sizeBytes: bytes.byteLength,
          bytesBase64: bytes.toString('base64'),
        }
      }),
    })
    if (aggregateLimitResult.ok || aggregateLimitResult.error.code !== 'invalid-request') {
      throw new Error(`${NAME}: aggregate attachment overflow did not fail closed`)
    }
    if (providerCalls.sdkSendMailCalls !== sdkSendCallsBeforeFailures) {
      throw new Error(`${NAME}: rejected Host sends reached the SDK`)
    }
    await new Promise(resolveDelay => setTimeout(resolveDelay, 2_000))
    const peerFailureSubjects = (await peer.listMailInbox({ folder: 'inbox', limit: 100 })).items
      .filter(item => [invalidSubject, oversizedSubject, aggregateLimitSubject].includes(item.subject))
    if (peerFailureSubjects.length !== 0) {
      throw new Error(`${NAME}: rejected Host send reached the recipient mailbox`)
    }
    const historyAfterFailures = value(
      await primary.awiki.listMailInbox({ folder: 'sent', limit: 100 }),
      'list sent after failures',
    )
    if (historyAfterFailures.items.length !== historyBeforeFailures.items.length) {
      throw new Error(`${NAME}: rejected send created false success history`)
    }

    const localSent = historyAfterFailures.items.filter(item => item.subject === outboundSubject)
    if (localSent.length !== 1 || sentBefore.items.some(item => item.subject === outboundSubject)) {
      throw new Error(`${NAME}: outbound sent history is not exact-one`)
    }
    const localSentId = localSent[0]!.id
    const beforeRestartMatchCount = localSent.length
    const persistedFixtureByteMatchCount = await sentStoreFixtureByteMatchCount(
      required('DSH_AWIKI_PRIMARY_STATE_ROOT'),
      outbound,
    )
    await primary.fiber.dispose()
    primary = await mountPrimary(required('DSH_AWIKI_PRIMARY_STATE_ROOT'), providerCalls)
    const restored = value(await primary.awiki.readMail({ messageId: localSentId }), 'read sent history after restart')
    const restoredSent = value(
      await primary.awiki.listMailInbox({ folder: 'sent', limit: 100 }),
      'list sent history after restart',
    )
    const afterRestartMatchCount = restoredSent.items.filter(item => item.subject === outboundSubject).length
    if (restored.attachments.length !== 1
      || restored.attachments[0]?.fileName !== manifest.fixtures.outbound.file_name
      || restored.attachments[0]?.contentType !== manifest.fixtures.outbound.content_type
      || restored.attachments[0]?.sizeBytes !== String(outbound.byteLength)
      || persistedFixtureByteMatchCount !== 0) {
      throw new Error(`${NAME}: sent history did not restore metadata-only state`)
    }

    const runtime = await runtimeVersions(expectedVersions)
    await cleanupMailRecords(primary, peer, mailRecords)
    if (mailRecords.length !== 0) throw new Error(`${NAME}: mail soft cleanup left active-accessible residual records`)
    cleanupConfirmed = true
    await writeCleanup(cleanupPath, dids, mailMessageCount, trackedMailRecordCount, mailRecords, 'cleaned')
    const residuals = {
      identity_count: dids.length,
      created_logical_mail_count: mailMessageCount,
      tracked_mail_record_count: trackedMailRecordCount,
      remaining_mail_record_count: mailRecords.length,
      cleanup_status: 'cleaned',
    } as const
    const fixtureEvidence = {
      outbound: {
        file_name: manifest.fixtures.outbound.file_name,
        content_type: manifest.fixtures.outbound.content_type,
        size_bytes: outbound.byteLength,
        sha256: digest(peerOutboundDownload.bytes),
      },
      inbound: {
        file_name: manifest.fixtures.inbound.file_name,
        content_type: manifest.fixtures.inbound.content_type,
        size_bytes: inbound.byteLength,
        sha256: digest(browserSave.bytes),
      },
    }
    const pluginManager = await pluginManagerReadback(expectedVersions)
    const evidence = {
      outbound_txt_sha256_verified: {
        fixture_sha256: manifest.fixtures.outbound.sha256,
        sdk_download_sha256: digest(peerOutboundDownload.bytes),
        sender_record_count: localSent.length,
        recipient_record_count: outboundRecipientRecordCount,
      },
      inbound_png_sha256_verified: {
        fixture_sha256: manifest.fixtures.inbound.sha256,
        sdk_source_sha256: digest(inbound),
        host_download_sha256: browserSave.hostDownload.sha256,
        browser_download_sha256: digest(browserSave.bytes),
        sender_record_count: inboundSenderRecordCount,
        recipient_record_count: inboundRecipientRecordCount,
      },
      inbound_metadata_download_consistent: {
        metadata_file_name: downloadable.fileName,
        metadata_content_type: downloadable.contentType,
        metadata_size_bytes: downloadable.sizeBytes,
        host_file_name: browserSave.hostDownload.fileName,
        host_content_type: browserSave.hostDownload.contentType,
        host_size_bytes: browserSave.hostDownload.sizeBytes,
        browser_size_bytes: browserSave.bytes.byteLength,
      },
      browser_download_integrity_verified: {
        sha256: digest(browserSave.bytes),
        size_bytes: browserSave.bytes.byteLength,
      },
      sent_history_restored_without_bytes: {
        before_send_match_count: sentBefore.items.filter(item => item.subject === outboundSubject).length,
        before_restart_match_count: beforeRestartMatchCount,
        after_restart_match_count: afterRestartMatchCount,
        persisted_fixture_byte_match_count: persistedFixtureByteMatchCount,
      },
      failed_send_has_no_success_history: {
        sent_count_before: historyBeforeFailures.items.length,
        sent_count_after: historyAfterFailures.items.length,
        recipient_match_count: peerFailureSubjects.length,
      },
      invalid_and_oversize_rejected_without_sdk_send: {
        sdk_send_calls_before: sdkSendCallsBeforeFailures,
        sdk_send_calls_after: providerCalls.sdkSendMailCalls,
        error_codes: [invalidBase64, oversized, aggregateLimitResult].map(result => result.ok ? 'unexpected-ok' : result.error.code),
        recipient_match_count: peerFailureSubjects.length,
      },
      cross_mailbox_download_rejected: {
        error_code: crossMailboxErrorCode,
        downloaded_byte_count: 0,
      },
      real_native_addon_and_versions_read_back: {
        native_addon_package: runtime.nativeAddonPackage,
        desktop_package_path_suffix: runtime.desktopPackagePathSuffix,
        desktop_package_name: runtime.desktopPackageName,
        desktop_package_version: runtime.versions.desktop_plugin_version,
        plugin_manager_profile_name: pluginManager.profileName,
        plugin_manager_package_name: pluginManager.packageName,
        plugin_manager_package_version: pluginManager.packageVersion,
        plugin_manager_load_count: pluginManager.loadCount,
      },
      cleanup_residuals_recorded: residuals,
    }
    if (Object.keys(evidence).sort().join('\n') !== [...manifest.required_checks].sort().join('\n')) {
      throw new Error(`${NAME}: acceptance evidence keys differ`)
    }
    await writeFile(reportPath, `${JSON.stringify({
      schema_version: 1,
      scenario: SCENARIO,
      status: 'passed',
      case_ids: manifest.case_ids,
      evidence,
      metrics: { total: 10, passed: 10, failed: 0, skipped: 0, errors: 0 },
      fixtures: fixtureEvidence,
      versions: runtime.versions,
      residuals,
    }, undefined, 2)}\n`, { encoding: 'utf8', mode: 0o600 })
  } finally {
    if (!cleanupConfirmed) {
      cleanupConfirmed = await settleCleanup(
        primary,
        peer,
        mailRecords,
        status => writeCleanup(
          cleanupPath,
          dids,
          mailMessageCount,
          trackedMailRecordCount,
          mailRecords,
          status,
        ),
      )
    } else {
      await writeCleanup(
        cleanupPath,
        dids,
        mailMessageCount,
        trackedMailRecordCount,
        mailRecords,
        'cleaned',
      ).catch(() => undefined)
    }
    await Promise.allSettled([primary?.fiber.dispose(), peer?.close()])
  }
}

if (values['contract-test'] === true) await runCleanupContractTests()
else await main()
