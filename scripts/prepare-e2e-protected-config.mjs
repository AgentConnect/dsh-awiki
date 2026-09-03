import { createHash } from 'node:crypto'
import { spawnSync } from 'node:child_process'
import { lstat, mkdir, open, readFile, realpath } from 'node:fs/promises'
import { dirname, isAbsolute, resolve } from 'node:path'

function fail(message) {
  throw new Error(message)
}

function argument(name) {
  const index = process.argv.indexOf(`--${name}`)
  if (index < 0 || !process.argv[index + 1]) fail(`missing --${name}`)
  return resolve(process.argv[index + 1])
}

function envValue(source, name) {
  const line = source.split(/\r?\n/u).find(value => value.startsWith(`${name}=`))
  if (line === undefined) fail(`protected source is missing ${name}`)
  const raw = line.slice(name.length + 1).trim()
  const value = raw.replace(/^(?:"([\s\S]*)"|'([\s\S]*)')$/u, (_match, double, single) => double ?? single ?? '')
  if (value === '') fail(`protected source has an empty ${name}`)
  return value
}

async function main() {
  const sourcePath = argument('source')
  const outputPath = argument('output')
  const cliBinary = argument('cli-binary')
  if (!isAbsolute(sourcePath) || !isAbsolute(outputPath) || !isAbsolute(cliBinary)) fail('paths must be absolute')
  const sourceMetadata = await lstat(sourcePath)
  if (!sourceMetadata.isFile() || sourceMetadata.isSymbolicLink()) fail('protected source must be a regular file')
  const cliMetadata = await lstat(cliBinary)
  if (!cliMetadata.isFile() || cliMetadata.isSymbolicLink()) fail('CLI binary must be a regular file')
  const source = await readFile(await realpath(sourcePath), 'utf8')
  const phone = envValue(source, 'DEV_OTP_PHONE')
  const otp = envValue(source, 'DEV_OTP_CODE')
  const target = envValue(source, 'DSH_AWIKI_E2E_TARGET')
  const modelProxyUrl = envValue(source, 'DSH_AWIKI_E2E_MODEL_PROXY_URL')
  const modelPrompt = envValue(source, 'DSH_AWIKI_E2E_MODEL_PROMPT')
  const modelExpectedText = envValue(source, 'DSH_AWIKI_E2E_MODEL_EXPECTED_TEXT')
  const mailEchoRecipient = envValue(source, 'DSH_AWIKI_E2E_MAIL_ECHO_RECIPIENT')
  const modelReceiptPath = envValue(source, 'DSH_AWIKI_E2E_MODEL_RECEIPT_PATH')
  const mailReceiptPath = envValue(source, 'DSH_AWIKI_E2E_MAIL_RECEIPT_PATH')
  const modelArtifactSha256 = envValue(source, 'DSH_AWIKI_E2E_MODEL_ARTIFACT_SHA256')
  const modelReceiptProducer = envValue(source, 'DSH_AWIKI_E2E_MODEL_RECEIPT_PRODUCER')
  const modelReceiptProducerSha256 = envValue(source, 'DSH_AWIKI_E2E_MODEL_RECEIPT_PRODUCER_SHA256')
  const modelReceiptProducerVersion = envValue(source, 'DSH_AWIKI_E2E_MODEL_RECEIPT_PRODUCER_VERSION')
  const mailReceiptProducer = envValue(source, 'DSH_AWIKI_E2E_MAIL_RECEIPT_PRODUCER')
  const mailReceiptProducerSha256 = envValue(source, 'DSH_AWIKI_E2E_MAIL_RECEIPT_PRODUCER_SHA256')
  const mailReceiptProducerVersion = envValue(source, 'DSH_AWIKI_E2E_MAIL_RECEIPT_PRODUCER_VERSION')
  const modelSourceCommit = envValue(source, 'DSH_AWIKI_E2E_MODEL_SOURCE_COMMIT')
  const modelSourceTree = envValue(source, 'DSH_AWIKI_E2E_MODEL_SOURCE_TREE')
  const mailSourceCommit = envValue(source, 'DSH_AWIKI_E2E_MAIL_SOURCE_COMMIT')
  const mailDeploymentArtifactSha256 = envValue(source, 'DSH_AWIKI_E2E_MAIL_DEPLOYMENT_ARTIFACT_SHA256')
  if (!/^\+[1-9][0-9]{7,14}$/u.test(phone) || !/^[0-9]{6}$/u.test(otp)) fail('protected credentials are invalid')
  const version = spawnSync(cliBinary, ['--format', 'json', 'version'], {
    encoding: 'utf8',
    timeout: 30_000,
    maxBuffer: 64 * 1024,
  })
  if (version.status !== 0) fail('CLI version probe failed')
  const payload = JSON.parse(version.stdout)
  const cliSourceRef = payload?.data?.commit
  if (typeof cliSourceRef !== 'string' || !/^[a-f0-9]{40}$/u.test(cliSourceRef)) fail('CLI source ref is invalid')
  const cliSha256 = createHash('sha256').update(await readFile(cliBinary)).digest('hex')
  await mkdir(dirname(outputPath), { recursive: true, mode: 0o700 })
  const file = await open(outputPath, 'wx', 0o600)
  try {
    await file.writeFile(`${JSON.stringify({
      schemaVersion: 2,
      target,
      phone,
      otp,
      handlePrefix: 'dshweb',
      cliBinary,
      cliSourceRef,
      cliSha256,
      modelProxyUrl,
      modelPrompt,
      modelExpectedText,
      mailEchoRecipient,
      modelReceiptPath,
      mailReceiptPath,
      modelArtifactSha256,
      modelReceiptProducer,
      modelReceiptProducerSha256,
      modelReceiptProducerVersion,
      mailReceiptProducer,
      mailReceiptProducerSha256,
      mailReceiptProducerVersion,
      modelSourceCommit,
      modelSourceTree,
      mailSourceCommit,
      mailDeploymentArtifactSha256,
    }, null, 2)}\n`)
  } finally {
    await file.close()
  }
  process.stdout.write('protected_config_ready=passed\n')
}

await main()
