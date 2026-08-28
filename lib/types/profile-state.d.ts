import type { Context } from '@deepseek-ai/cordis';
/**
 * Resolve the active DSH profile without guessing it from argv or process type.
 * Desktop's generation-scoped service is authoritative. Ordinary DSH has no
 * corresponding service, so its Loader root is accepted only when it is the
 * exact `$DSH_HOME/profiles/<name>` directory.
 */
export declare function resolveAwikiProfileName(ctx: Context, dshHome: string): string | undefined;
/** Resolve the profile-local default while preserving the legacy fallback. */
export declare function resolveAwikiStateRoot(ctx: Context, dshHome: string): string;
/**
 * Keep the deployment-default tenant on its historical path while isolating
 * every selected tenant beside it. Switching back therefore restores the
 * original identity instead of rewriting or clearing cryptographic state.
 */
export declare function resolveAwikiTenantStateRoot(baseStateRoot: string, domain: string, baseDomain: string): string;
//# sourceMappingURL=profile-state.d.ts.map