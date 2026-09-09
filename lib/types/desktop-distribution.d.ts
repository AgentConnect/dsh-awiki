/** Browser-safe projection of the optional Desktop-owned public update service. */
export interface AwikiDesktopDistribution {
    readonly schemaVersion: 1;
    readonly distributionId: 'awiki-dsh-desktop';
    readonly currentVersion: string;
    readonly channel: 'stable' | 'prerelease';
    readonly downloadPageUrl: string;
    readonly state: 'unchecked' | 'checking' | 'ready' | 'failed';
    readonly latestVersion?: string;
    readonly updateAvailable: boolean;
    readonly noRelease?: boolean;
    readonly usedCache: boolean;
    readonly checkedAt?: string;
    readonly bundledVersions?: Readonly<{
        plugin: string;
        modelProxy?: string;
    }>;
}
/** Structural consumer of Desktop's optional public contract; no Electron dependency. */
export interface AwikiDesktopDistributionService {
    getSnapshot(): unknown;
    check(): Promise<unknown>;
}
export declare function decodeDesktopDistribution(value: unknown): AwikiDesktopDistribution | undefined;
//# sourceMappingURL=desktop-distribution.d.ts.map