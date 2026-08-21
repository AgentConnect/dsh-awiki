declare module 'qrcode/lib/browser.js' {
  interface ToDataUrlOptions {
    readonly width?: number
    readonly margin?: number
    readonly errorCorrectionLevel?: 'L' | 'M' | 'Q' | 'H'
    readonly color?: {
      readonly dark?: string
      readonly light?: string
    }
  }

  const QRCode: {
    toDataURL(text: string, options?: ToDataUrlOptions): Promise<string>
  }

  export default QRCode
}
