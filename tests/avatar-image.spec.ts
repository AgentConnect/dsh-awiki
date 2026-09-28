import { describe, expect, it } from 'vitest'
import { avatarImageDimensions, AVATAR_SOURCE_MAX_BYTES } from '../src/client/avatar-image.ts'
import { safeAvatarUrl } from '../src/client/avatar-cache.ts'

function png(width: number, height: number, animated = false): Uint8Array {
  const bytes = new Uint8Array(animated ? 53 : 33)
  bytes.set([137, 80, 78, 71, 13, 10, 26, 10]); const view = new DataView(bytes.buffer)
  view.setUint32(8, 13); bytes.set([73, 72, 68, 82], 12)
  view.setUint32(16, width); view.setUint32(20, height)
  if (animated) { view.setUint32(33, 8); bytes.set([97, 99, 84, 76], 37); view.setUint32(41, 2) }
  return bytes
}
function jpeg(width: number, height: number): Uint8Array {
  const bytes = new Uint8Array([255, 216, 255, 192, 0, 8, 8, 0, 0, 0, 0, 3, 255, 217])
  const view = new DataView(bytes.buffer); view.setUint16(7, height); view.setUint16(9, width); return bytes
}
describe('avatar image envelope', () => {
  it('checks dimensions before decode and accepts static JPEG/PNG headers', () => {
    expect(avatarImageDimensions(png(1200, 800))).toEqual({ width: 1200, height: 800, mime: 'image/png' })
    expect(avatarImageDimensions(jpeg(800, 1200))).toEqual({ width: 800, height: 1200, mime: 'image/jpeg' })
    expect(() => avatarImageDimensions(png(16385, 1))).toThrow()
    expect(() => avatarImageDimensions(png(10000, 6000))).toThrow()
    expect(() => avatarImageDimensions(png(5000, 2), false)).toThrow()
  })
  it('rejects oversized, animated, truncated and disguised input', () => {
    expect(() => avatarImageDimensions(new Uint8Array(AVATAR_SOURCE_MAX_BYTES + 1))).toThrow()
    expect(() => avatarImageDimensions(png(32, 32, true))).toThrow('静态')
    expect(() => avatarImageDimensions(new TextEncoder().encode('<svg width="1024"/>'))).toThrow()
    expect(() => avatarImageDimensions(png(32, 32).slice(0, 30))).toThrow()
  })
  it('rejects credentials, non-HTTPS and active formats in avatar URLs', () => {
    for (const value of ['http://example.com/a.jpg', 'https://user:secret@example.com/a.jpg', 'https://example.com/a.svg', 'https://example.com/a.html', 'https://example.com/a.jpg#x', 'data:image/png;base64,AA']) expect(safeAvatarUrl(value)).toBeUndefined()
    expect(safeAvatarUrl('https://example.com/a.jpg')).toBe('https://example.com/a.jpg')
  })
})
