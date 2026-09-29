import { build, preview } from 'vite'
import { chromium } from '@playwright/test'
import { mkdir, readFile, writeFile } from 'node:fs/promises'
import { resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
const root = fileURLToPath(new URL('.', import.meta.url))
const output = resolve(process.argv[2] ?? '.artifacts/avatar-performance')
await mkdir(output, { recursive: true })
await build({ configFile: false, root, oxc: { jsx: { runtime: 'automatic' } }, build: { outDir: resolve(output, 'site'), emptyOutDir: true } })
const server = await preview({ configFile: false, root, build: { outDir: resolve(output, 'site') }, preview: { host: '127.0.0.1', port: 0 } })
const browser = await chromium.launch()
const jpeg = await readFile(new URL('./avatar.jpg', import.meta.url))
const runs = []
try {
  for (let round = 0; round < 3; round++) {
    const context = await browser.newContext({ viewport: { width: 1280, height: 900 } })
    const coldUrls = new Set()
    for (const mode of ['fallback', 'cold', 'warm']) {
      const page = await context.newPage()
      let imageRequests = 0
      let repeatedImageRequests = 0
      await page.route('https://avatar-benchmark.invalid/**', async route => {
        imageRequests++
        if (mode === 'warm' && coldUrls.has(route.request().url())) repeatedImageRequests++
        if (mode === 'cold') coldUrls.add(route.request().url())
        await route.fulfill({ body: jpeg, contentType: 'image/jpeg', headers: { 'access-control-allow-origin': '*', 'cache-control': 'max-age=604800, immutable' } })
      })
      await page.goto(`${server.resolvedUrls.local[0]}?round=${round}&mode=${mode}`)
      await page.locator('#conversations > div').last().waitFor({ state: 'attached' })
      await page.waitForTimeout(1000)
      const frames = await page.evaluate(async () => {
        const list = document.getElementById('conversations')
        const samples = []
        for (const reverse of [false, true]) {
          await new Promise(resolve => {
            let start, previous
            function frame(now) {
              start ??= now
              if (previous !== undefined) samples.push(now - previous)
              previous = now
              const fraction = Math.min(1, (now - start) / 6000)
              list.scrollTop = (list.scrollHeight - list.clientHeight) * (reverse ? 1 - fraction : fraction)
              if (fraction < 1) requestAnimationFrame(frame); else resolve()
            }
            requestAnimationFrame(frame)
          })
        }
        return samples.sort((a, b) => a - b)
      })
      await page.waitForTimeout(1500)
      if (frames.length < 120) throw new Error('insufficient frame samples')
      if (mode === 'warm' && repeatedImageRequests !== 0) throw new Error(`warm cache repeated ${repeatedImageRequests} image requests`)
      const result = { round, mode, conversations: 1000, fourMemberGroups: 200, frames: frames.length,
        frameIntervalP95Ms: frames[Math.ceil(frames.length * .95) - 1], imageRequests,
        repeatedImageRequests, newlyVisibleImageRequests: mode === 'warm' ? imageRequests - repeatedImageRequests : 0 }
      runs.push(result); console.log(JSON.stringify(result))
      await page.close()
    }
    await context.close()
  }
  await writeFile(resolve(output, 'result.json'), JSON.stringify({ schemaVersion: 1, browser: browser.version(),
    buildMode: 'production', scope: 'production avatar/provider/IDB in a synthetic 1000-row list; no Host/backend timing',
    metric: 'requestAnimationFrame interval including vsync, not JS CPU duration', runs }, null, 2))
} finally {
  await browser.close()
  server.httpServer.close()
}
