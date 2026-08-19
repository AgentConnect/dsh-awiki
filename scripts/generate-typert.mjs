import { mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs'
import { dirname, join, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import ts from 'typescript'
import { FaceModelEmitter, WorkspaceAnalyzer } from '@deepseek-ai/dsh-typert-generator'

const projectRoot = resolve(dirname(fileURLToPath(import.meta.url)), '..')
const packageName = '@awiki/dsh-plugin'
const cacheRoot = join(projectRoot, 'node_modules', '.cache')
const sourceText = readFileSync(join(projectRoot, 'src', 'index.ts'), 'utf8')
const sourceFile = ts.createSourceFile('index.ts', sourceText, ts.ScriptTarget.Latest, true, ts.ScriptKind.TS)

const service = sourceFile.statements.find(statement =>
  ts.isClassDeclaration(statement) && statement.name?.text === 'AwikiService')
if (service === undefined || !ts.isClassDeclaration(service)) {
  throw new Error('Typert generation could not find AwikiService')
}

const imports = sourceFile.statements
  .filter(ts.isImportDeclaration)
  .filter(statement => [
    '@deepseek-ai/cordis',
    '@deepseek-ai/dsh-typert-protocol',
    './types.ts',
  ].includes(statement.moduleSpecifier.text))
  .map(statement => statement.getText(sourceFile))

const remoteMethods = service.members
  .filter(ts.isMethodDeclaration)
  .filter(method => (ts.getDecorators(method) ?? []).some(decorator => {
    const expression = ts.isCallExpression(decorator.expression)
      ? decorator.expression.expression
      : decorator.expression
    return expression.getText(sourceFile) === 'Remote'
  }))
  .map(method => {
    if (method.body === undefined) throw new Error(`Remote method ${method.name.getText(sourceFile)} has no body`)
    const signature = sourceText.slice(method.getStart(sourceFile), method.body.getStart(sourceFile))
    return `${signature}{ throw new Error('Typert contract analysis only') }`
  })

if (remoteMethods.length === 0) throw new Error('Typert generation found no @Remote methods')

mkdirSync(cacheRoot, { recursive: true })
const scratchRoot = mkdtempSync(join(cacheRoot, 'awiki-typert-'))
const pluginRoot = join(scratchRoot, 'packages', 'dsh-awiki')
const protocolRoot = join(scratchRoot, 'packages', 'typert-protocol')

try {
  mkdirSync(join(pluginRoot, 'src'), { recursive: true })
  mkdirSync(join(protocolRoot, 'src'), { recursive: true })

  const manifest = JSON.parse(readFileSync(join(projectRoot, 'package.json'), 'utf8'))
  manifest.exports = {
    '.': manifest.exports['.'],
    './types': manifest.exports['./types'],
    './typert': manifest.exports['./typert'],
    './remote': manifest.exports['./remote'],
  }
  manifest.files = [
    'lib/typert.host.js',
    'lib/typert.host.d.ts',
    'lib/typert.remote-client.js',
    'lib/typert.remote-client.d.ts',
  ]
  writeFileSync(join(pluginRoot, 'package.json'), JSON.stringify(manifest))
  writeFileSync(join(pluginRoot, 'src', 'index.ts'), [
    ...imports,
    'export class AwikiService extends TypertRemoteService {',
    '  constructor(ctx: Context) { super(ctx, \'awiki\') }',
    ...remoteMethods,
    '}',
  ].join('\n\n'))
  writeFileSync(
    join(pluginRoot, 'src', 'types.ts'),
    readFileSync(join(projectRoot, 'src', 'types.ts')),
  )
  writeFileSync(join(pluginRoot, 'tsconfig.json'), JSON.stringify({
    extends: join(projectRoot, 'tsconfig.base.json'),
    compilerOptions: { rootDir: 'src', outDir: 'lib/types' },
    include: ['src'],
  }))

  writeFileSync(join(protocolRoot, 'package.json'), JSON.stringify({
    name: '@deepseek-ai/dsh-typert-protocol',
    type: 'module',
    exports: { '.': { types: './lib/types/index.d.ts', default: './lib/index.js' } },
  }))
  writeFileSync(join(protocolRoot, 'tsconfig.json'), JSON.stringify({
    extends: join(projectRoot, 'tsconfig.base.json'),
    compilerOptions: { rootDir: 'src', outDir: 'lib/types' },
    include: ['src'],
  }))
  writeFileSync(join(protocolRoot, 'src', 'index.ts'), `
import { Service, type Context } from '@deepseek-ai/cordis'

type RemoteMethodDecorator = <This extends object, Args extends unknown[], Result>(
  method: (this: This, ...args: Args) => Result,
  context: ClassMethodDecoratorContext<This, (this: This, ...args: Args) => Result>,
) => void

export function Remote<This extends object, Args extends unknown[], Result>(
  _method: (this: This, ...args: Args) => Result,
  _context: ClassMethodDecoratorContext<This, (this: This, ...args: Args) => Result>,
): void
export function Remote(_exportName: string): RemoteMethodDecorator
export function Remote(): void | RemoteMethodDecorator {
  throw new Error('Typert contract analysis only')
}

export abstract class TypertRemoteService extends Service {
  protected constructor(ctx: Context, serviceKey: string) {
    super(ctx, serviceKey)
  }
}
`)

  const compilerOptions = JSON.parse(readFileSync(join(projectRoot, 'tsconfig.base.json'), 'utf8')).compilerOptions
  compilerOptions.baseUrl = scratchRoot
  compilerOptions.paths = {
    '@deepseek-ai/dsh-typert-protocol': [join(protocolRoot, 'src', 'index.ts')],
  }
  writeFileSync(join(scratchRoot, 'tsconfig.host.json'), JSON.stringify({
    compilerOptions: {
      ...compilerOptions,
      noEmit: true,
      rewriteRelativeImportExtensions: false,
    },
    files: [],
    references: [
      { path: join(pluginRoot, 'tsconfig.json') },
      { path: join(protocolRoot, 'tsconfig.json') },
    ],
  }))

  const workspace = new WorkspaceAnalyzer({
    root: scratchRoot,
    faces: ['host'],
    packages: [packageName],
    checkDiagnostics: false,
  }).analyze()
  const hostFace = workspace.faces.find(face => face.face === 'host')
  if (hostFace === undefined) throw new Error('Typert generation produced no Host face')
  const artifact = new FaceModelEmitter(hostFace).emit(packageName)
  if (artifact.remote === undefined) throw new Error('Typert generation produced no Remote projection')

  const outputRoot = join(projectRoot, 'lib')
  writeFileSync(join(outputRoot, 'typert.host.js'), artifact.js)
  writeFileSync(join(outputRoot, 'typert.host.d.ts'), artifact.dts)
  writeFileSync(join(outputRoot, 'typert.remote-client.js'), artifact.remote.js)
  writeFileSync(join(outputRoot, 'typert.remote-client.d.ts'), artifact.remote.dts)
  writeFileSync(join(outputRoot, 'typert.remote-client.d.ts.map'), artifact.remote.dtsMap)
  console.log(`generated Typert contract: ${remoteMethods.length} @Remote methods`)
} finally {
  rmSync(scratchRoot, { recursive: true, force: true })
}
