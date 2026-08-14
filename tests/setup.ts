import { vi } from 'vitest'

if (typeof window !== 'undefined') {
  class TestPointerEvent extends MouseEvent {
    readonly pointerId: number

    constructor(type: string, init: PointerEventInit = {}) {
      super(type, init)
      this.pointerId = init.pointerId ?? 0
    }
  }

  Object.defineProperty(window, 'PointerEvent', { configurable: true, value: TestPointerEvent })
  Object.defineProperty(globalThis, 'PointerEvent', { configurable: true, value: TestPointerEvent })
  Object.defineProperty(HTMLElement.prototype, 'setPointerCapture', { configurable: true, value: vi.fn() })
  Object.defineProperty(HTMLElement.prototype, 'releasePointerCapture', { configurable: true, value: vi.fn() })

  if (typeof File !== 'undefined' && File.prototype.arrayBuffer === undefined) {
    Object.defineProperty(File.prototype, 'arrayBuffer', {
      configurable: true,
      value(this: File): Promise<ArrayBuffer> {
        return new Promise((resolve, reject) => {
          const reader = new FileReader()
          reader.addEventListener('load', () => { resolve(reader.result as ArrayBuffer) })
          reader.addEventListener('error', () => { reject(reader.error ?? new Error('failed to read test file')) })
          reader.readAsArrayBuffer(this)
        })
      },
    })
  }
}
