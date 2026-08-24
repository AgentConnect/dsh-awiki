/** Notice that Contact developer needs the AWiki messaging plugin. */
import { type ReactNode } from 'react';
import type { PropsLocale } from '@deepseek-ai/dsh-client-ui-slots';
interface InstallAwikiPluginDialogProps {
    readonly open: boolean;
    readonly onClose: () => void;
    readonly t: PropsLocale<'settings.awiki-model-proxy'>['t'];
}
/** Explain how to install `@awiki/dsh-plugin` before opening the maintainer chat. */
export declare function InstallAwikiPluginDialog({ open, onClose, t }: InstallAwikiPluginDialogProps): ReactNode;
export {};
//# sourceMappingURL=InstallAwikiPluginDialog.d.ts.map