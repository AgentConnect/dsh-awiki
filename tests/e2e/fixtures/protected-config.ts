import { createHash } from 'node:crypto'
import { access, lstat, readFile, realpath, stat } from 'node:fs/promises'
import { constants } from 'node:fs'
import { isAbsolute, relative, resolve, sep } from 'node:path'
import { fileURLToPath } from 'node:url'

const repositoryRoot = fileURLToPath(new URL('../../..', import.meta.url))
const allowedKeys = new Set([
  'schemaVersion',
  'target',
  'phone',
  'otp',
  'handlePrefix',
  'cliBinary',
  'cliSourceRef',
  'cliSha256',
  'modelProxyUrl',
  'modelPrompt',
  'modelExpectedText',
  'mailEchoRecipient',
])

export const reviewedE2eTarget = Object.freeze({
  name: 'rwiki-cn-testing',
  didDomain: 'rwiki.cn',
  userServiceUrl: 'https://rwiki.cn',
  messageServiceUrl: 'https://rwiki.cn',
  messageServiceWsUrl: 'wss://rwiki.cn/im/ws',
  messageServiceDid: 'did:wba:rwiki.cn',
  operatorProfile: 'rwiki-cn-managed-local-v1',
})

export interface ProtectedE2eConfig {
  readonly schemaVersion: 2
  readonly target: 'rwiki-cn-testing'
  readonly phone: string
  readonly otp: string
  readonly handlePrefix: string
  readonly cliBinary: string
  readonly cliSourceRef: string
  readonly cliSha256: string
  readonly modelProxyUrl: string
  readonly modelPrompt: string
  readonly modelExpectedText: string
  readonly mailEchoRecipient: string
}

function requireString(value: unknown, label: string): string {
  if (typeof value !== 'string' || value.trim() === '') {
    throw new Error(`DSH E2E protected config ${label} is invalid`)
  }
  return value.trim()
}

async function sha256(path: string): Promise<string> {
  return createHash('sha256').update(await readFile(path)).digest('hex')
}

export async function loadProtectedE2eConfig(path: string): Promise<ProtectedE2eConfig> {
  if (!isAbsolute(path)) throw new Error('DSH E2E protected config path must be absolute')
  const metadata = await lstat(path)
  if (!metadata.isFile() || metadata.isSymbolicLink()) {
    throw new Error('DSH E2E protected config must be a regular non-symlink file')
  }
  if ((metadata.mode & 0o777) !== 0o600) {
    throw new Error('DSH E2E protected config permissions must be 0600')
  }
  if (process.getuid !== undefined && metadata.uid !== process.getuid()) {
    throw new Error('DSH E2E protected config must be owned by the current user')
  }
  const actual = await realpath(path)
  const relativeToRepository = relative(repositoryRoot, actual)
  if (relativeToRepository === '' || (!relativeToRepository.startsWith(`..${sep}`) && relativeToRepository !== '..')) {
    throw new Error('DSH E2E protected config must stay outside the repository')
  }
  const decoded = JSON.parse(await readFile(actual, 'utf8')) as unknown
  if (typeof decoded !== 'object' || decoded === null || Array.isArray(decoded)) {
    throw new Error('DSH E2E protected config must be a JSON object')
  }
  const source = decoded as Record<string, unknown>
  for (const key of Object.keys(source)) {
    if (!allowedKeys.has(key)) throw new Error(`DSH E2E protected config contains unknown field ${key}`)
  }
  if (source.schemaVersion !== 2 || source.target !== reviewedE2eTarget.name) {
    throw new Error('DSH E2E protected config schema or target is invalid')
  }
  const phone = requireString(source.phone, 'phone')
  const otp = requireString(source.otp, 'otp')
  const handlePrefix = requireString(source.handlePrefix, 'handlePrefix').toLowerCase()
  const rawCliBinary = requireString(source.cliBinary, 'cliBinary')
  if (!isAbsolute(rawCliBinary)) throw new Error('DSH E2E protected config cliBinary must be absolute')
  const cliBinary = resolve(rawCliBinary)
  const cliSourceRef = requireString(source.cliSourceRef, 'cliSourceRef').toLowerCase()
  const cliSha256 = requireString(source.cliSha256, 'cliSha256').toLowerCase()
  const modelProxyUrl = requireString(source.modelProxyUrl, 'modelProxyUrl')
  const modelPrompt = requireString(source.modelPrompt, 'modelPrompt')
  const modelExpectedText = requireString(source.modelExpectedText, 'modelExpectedText')
  const mailEchoRecipient = requireString(source.mailEchoRecipient, 'mailEchoRecipient').toLowerCase()
  if (!/^\+[1-9][0-9]{7,14}$/u.test(phone)) throw new Error('DSH E2E protected config phone is invalid')
  if (!/^[0-9]{6}$/u.test(otp)) throw new Error('DSH E2E protected config otp is invalid')
  if (!/^[a-z][a-z0-9]{2,31}$/u.test(handlePrefix)) throw new Error('DSH E2E protected config handlePrefix is invalid')
  if (!/^[a-f0-9]{40}$/u.test(cliSourceRef) || /^0{40}$/u.test(cliSourceRef)) {
    throw new Error('DSH E2E protected config cliSourceRef is invalid')
  }
  if (!/^[a-f0-9]{64}$/u.test(cliSha256)) throw new Error('DSH E2E protected config cliSha256 is invalid')
  const modelOrigin = new URL(modelProxyUrl)
  if ((modelOrigin.protocol !== 'https:'
      && !(modelOrigin.protocol === 'http:' && ['127.0.0.1', 'localhost', '::1'].includes(modelOrigin.hostname)))
    || modelOrigin.username !== ''
    || modelOrigin.password !== ''
    || modelOrigin.search !== ''
    || modelOrigin.hash !== '') {
    throw new Error('DSH E2E protected config modelProxyUrl is invalid')
  }
  for (const [label, value] of [['modelPrompt', modelPrompt], ['modelExpectedText', modelExpectedText]] as const) {
    if (Buffer.byteLength(value, 'utf8') > 512 || /[\u0000-\u001f\u007f]/u.test(value)) {
      throw new Error(`DSH E2E protected config ${label} is invalid`)
    }
  }
  if (!/^[^\s@]+@[^\s@]+$/u.test(mailEchoRecipient) || mailEchoRecipient.length > 320) {
    throw new Error('DSH E2E protected config mailEchoRecipient is invalid')
  }
  if ([modelPrompt, modelExpectedText, mailEchoRecipient].includes(phone)
    || [modelPrompt, modelExpectedText, mailEchoRecipient].includes(otp)) {
    throw new Error('DSH E2E protected config fixtures must not reuse credentials')
  }
  const cliMetadata = await stat(cliBinary)
  if (!cliMetadata.isFile()) throw new Error('DSH E2E CLI binary is not a regular file')
  await access(cliBinary, constants.X_OK)
  if (await sha256(cliBinary) !== cliSha256) throw new Error('DSH E2E CLI binary SHA-256 mismatch')
  return {
    schemaVersion: 2,
    target: reviewedE2eTarget.name,
    phone,
    otp,
    handlePrefix,
    cliBinary,
    cliSourceRef,
    cliSha256,
    modelProxyUrl: modelOrigin.toString().replace(/\/$/u, ''),
    modelPrompt,
    modelExpectedText,
    mailEchoRecipient,
  }
}

export const protectedConfigRepositoryRoot = resolve(repositoryRoot)
