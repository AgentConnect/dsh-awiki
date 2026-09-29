import 'react-image-crop/dist/ReactCrop.css';
import type { AwikiProfile } from '../types.ts';
import type { AwikiOverlayProps } from './slots.ts';
type Actions = Pick<AwikiOverlayProps, 'setAvatar' | 'clearAvatar' | 'refreshAvatarProfile'>;
export declare function AwikiAvatarEditor(props: Actions & {
    profile: AwikiProfile | null;
    owner: string;
    onClose: () => void;
}): import("react").JSX.Element;
export {};
//# sourceMappingURL=AwikiAvatarEditor.d.ts.map