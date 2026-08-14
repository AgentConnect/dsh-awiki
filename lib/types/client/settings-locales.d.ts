/** Bilingual copy for the AWiki settings section. */
/** Keys owned by the AWiki settings page. */
export type AwikiSettingsKey = 'nav' | 'intro' | 'domainLabel' | 'domainDescription' | 'defaultValue' | 'save' | 'saving' | 'reset' | 'saved' | 'restartNotice' | 'identityNotice' | 'invalidDomain' | 'saveFailed' | 'loading' | 'unavailable' | 'readOnly';
/** Simplified Chinese dictionary. */
export declare const zh: Record<AwikiSettingsKey, string>;
/** English dictionary. */
export declare const en: Record<AwikiSettingsKey, string>;
declare module '@deepseek-ai/dsh-client-ui-slots' {
    interface LocaleNamespaceMap {
        'settings.awiki': AwikiSettingsKey;
    }
}
//# sourceMappingURL=settings-locales.d.ts.map