export declare const IDENTITY_PACKAGE = "@agent-network-protocol/dsh-anp-identity";
export interface InstallationRequirements {
    readonly runtime_packages: Readonly<Record<string, string>>;
    readonly identity: {
        readonly package_name: typeof IDENTITY_PACKAGE;
        readonly version: string;
        readonly integrity: string;
    };
    readonly requires_identity: string;
}
export type InstallationBlockedReason = 'installation-unverified' | 'host-incompatible' | 'identity-incompatible';
export declare function decodeInstallation(value: unknown): InstallationRequirements | undefined;
export declare function checkInstallation(requirements: InstallationRequirements | undefined, installed?: Readonly<Record<string, string | undefined>>): {
    blockedReason?: InstallationBlockedReason;
    identityTarget?: string;
};
//# sourceMappingURL=update-installation.d.ts.map