import { readFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'
import { load } from 'js-yaml'
import {
  applyEntryPatches,
  entryListSchema,
  type PatchOptions,
} from '@deepseek-ai/cordis-plugin-include'

interface Entry {
  readonly id?: string
  readonly name?: string
  readonly inject?: readonly string[]
}

function patches(url: URL): PatchOptions[] {
  return load(readFileSync(url, 'utf8'), { schema: entryListSchema }) as PatchOptions[]
}

const mainPatch = patches(new URL('../../../cordis.patch.yml', import.meta.url))
const modelPatch = patches(new URL('../cordis.patch.yml', import.meta.url))

function modelEntries(entries: readonly Entry[]): Entry[] {
  return entries.filter(entry => entry.id === 'awiki-model-proxy')
}

describe('AWiki package patch composition', () => {
  it('keeps the main package free of a model-proxy runtime row', () => {
    const entries = applyEntryPatches([], mainPatch, () => {})

    expect(entries.some(entry => entry.id === 'awiki')).toBe(true)
    expect(modelEntries(entries)).toEqual([])
  })

  it('adds exactly one model proxy after AWiki with an explicit service dependency', () => {
    const main = applyEntryPatches([], mainPatch, () => {})
    const combined = applyEntryPatches(main, modelPatch, () => {})
    const proxy = modelEntries(combined)

    expect(proxy).toHaveLength(1)
    expect(proxy[0]).toMatchObject({
      name: '@awiki/dsh-model-proxy',
      inject: ['awiki'],
    })
    expect(combined.findIndex(entry => entry.id === 'awiki')).toBeLessThan(
      combined.findIndex(entry => entry.id === 'awiki-model-proxy'),
    )
  })
})
