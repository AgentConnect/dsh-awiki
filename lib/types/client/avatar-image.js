/** Public image parsing and browser-owned avatar processing. No authentication. */
export const AVATAR_SOURCE_MAX_BYTES = 20 * 1024 * 1024;
export const AVATAR_UPLOAD_MAX_BYTES = 512 * 1024;
export function avatarImageDimensions(bytes, upload = true) {
    if (bytes.length < 12 || bytes.length > (upload ? AVATAR_SOURCE_MAX_BYTES : 1024 * 1024))
        throw new Error('图片过大或损坏');
    const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
    const ascii = (offset, length) => String.fromCharCode(...bytes.subarray(offset, offset + length));
    let width = 0, height = 0, mime = '';
    if (bytes[0] === 0xff && bytes[1] === 0xd8) {
        mime = 'image/jpeg';
        let offset = 2;
        while (offset + 4 <= bytes.length) {
            if (bytes[offset] !== 0xff)
                break;
            while (bytes[offset] === 0xff)
                offset++;
            const marker = bytes[offset++];
            if (marker === 0xd9 || marker === 0xda)
                break;
            if (marker === 0x01 || (marker >= 0xd0 && marker <= 0xd7))
                continue;
            if (offset + 2 > bytes.length)
                break;
            const size = view.getUint16(offset);
            if (size < 2 || offset + size > bytes.length)
                break;
            if ([0xc0, 0xc1, 0xc2].includes(marker) && size >= 8) {
                height = view.getUint16(offset + 3);
                width = view.getUint16(offset + 5);
                break;
            }
            offset += size;
        }
    }
    else if (view.getUint32(0) === 0x89504e47 && view.getUint32(4) === 0x0d0a1a0a && bytes.length >= 33 && ascii(12, 4) === 'IHDR') {
        mime = 'image/png';
        width = view.getUint32(16);
        height = view.getUint32(20);
        for (let offset = 8; offset + 12 <= bytes.length;) {
            const size = view.getUint32(offset);
            if (offset + size + 12 > bytes.length)
                throw new Error('图片损坏');
            if (ascii(offset + 4, 4) === 'acTL')
                throw new Error('请选择静态图片');
            offset += size + 12;
        }
    }
    else if (ascii(0, 4) === 'RIFF' && ascii(8, 4) === 'WEBP' && bytes.length >= 30) {
        mime = 'image/webp';
        const kind = ascii(12, 4);
        if (kind === 'VP8X') {
            if ((bytes[20] & 2) !== 0)
                throw new Error('请选择静态图片');
            width = 1 + bytes[24] + (bytes[25] << 8) + (bytes[26] << 16);
            height = 1 + bytes[27] + (bytes[28] << 8) + (bytes[29] << 16);
        }
        else if (kind === 'VP8 ' && bytes[23] === 0x9d && bytes[24] === 0x01 && bytes[25] === 0x2a) {
            width = view.getUint16(26, true) & 0x3fff;
            height = view.getUint16(28, true) & 0x3fff;
        }
        else if (kind === 'VP8L' && bytes[20] === 0x2f) {
            const bits = view.getUint32(21, true);
            width = (bits & 0x3fff) + 1;
            height = ((bits >>> 14) & 0x3fff) + 1;
        }
    }
    const edge = upload ? 16384 : 4096, pixels = upload ? 50_000_000 : 16_000_000;
    if (width < 1 || height < 1 || width > edge || height > edge || width * height > pixels)
        throw new Error('请选择尺寸合适的 JPEG、PNG 或静态 WebP 图片');
    return { width, height, mime };
}
export async function avatarPreview(file) {
    if (file.size > AVATAR_SOURCE_MAX_BYTES)
        throw new Error('图片不能超过 20 MB');
    const bytes = new Uint8Array(await file.arrayBuffer());
    const info = avatarImageDimensions(bytes);
    const source = await createImageBitmap(new Blob([bytes], { type: info.mime }), {
        imageOrientation: 'from-image', colorSpaceConversion: 'default',
    });
    const scale = Math.min(1, 2048 / Math.max(source.width, source.height));
    if (scale === 1)
        return source;
    try {
        return await createImageBitmap(source, { resizeWidth: Math.max(1, Math.round(source.width * scale)), resizeHeight: Math.max(1, Math.round(source.height * scale)), resizeQuality: 'high' });
    }
    finally {
        source.close();
    }
}
export function drawAvatarCrop(canvas, source, crop) {
    const context = canvas.getContext('2d', { alpha: false, colorSpace: 'srgb' });
    if (context === null)
        throw new Error('当前浏览器无法处理图片');
    const edge = Math.min(source.width, source.height) / Math.max(1, Math.min(4, crop.zoom));
    const x = (source.width - edge) * Math.max(0, Math.min(1, crop.x));
    const y = (source.height - edge) * Math.max(0, Math.min(1, crop.y));
    context.fillStyle = '#fff';
    context.fillRect(0, 0, canvas.width, canvas.height);
    context.drawImage(source, x, y, edge, edge, 0, 0, canvas.width, canvas.height);
}
export async function avatarJpeg(source, crop) {
    const canvas = document.createElement('canvas');
    canvas.width = 512;
    canvas.height = 512;
    try {
        drawAvatarCrop(canvas, source, crop);
        for (const quality of [0.9, 0.85, 0.8]) {
            const blob = await new Promise(resolve => canvas.toBlob(resolve, 'image/jpeg', quality));
            if (blob === null || blob.size > AVATAR_UPLOAD_MAX_BYTES)
                continue;
            const bytes = new Uint8Array(await blob.arrayBuffer());
            let binary = '';
            for (let offset = 0; offset < bytes.length; offset += 8192)
                binary += String.fromCharCode(...bytes.subarray(offset, offset + 8192));
            return btoa(binary);
        }
        throw new Error('图片压缩失败，请换一张照片');
    }
    finally {
        canvas.width = 0;
        canvas.height = 0;
    }
}
//# sourceMappingURL=avatar-image.js.map