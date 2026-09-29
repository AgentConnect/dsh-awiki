/** Public image parsing and browser-owned avatar processing. No authentication. */
export declare const AVATAR_SOURCE_MAX_BYTES: number;
export declare const AVATAR_UPLOAD_MAX_BYTES: number;
export declare function avatarImageDimensions(bytes: Uint8Array, upload?: boolean): {
    width: number;
    height: number;
    mime: string;
};
export declare function avatarPreview(file: File): Promise<ImageBitmap>;
/** Source-pixel square shared by the selection, preview and final JPEG. */
export interface AvatarCrop {
    readonly edge: number;
    readonly x: number;
    readonly y: number;
}
export declare function initialAvatarCrop(source: {
    width: number;
    height: number;
}): AvatarCrop;
export declare function avatarCropRectangle(source: {
    width: number;
    height: number;
}, crop: AvatarCrop): AvatarCrop;
export declare function drawAvatarCrop(canvas: HTMLCanvasElement, source: ImageBitmap, crop: AvatarCrop): void;
export declare function avatarJpeg(source: ImageBitmap, crop: AvatarCrop): Promise<string>;
//# sourceMappingURL=avatar-image.d.ts.map