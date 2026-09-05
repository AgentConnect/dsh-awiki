import type { Context } from '@deepseek-ai/cordis';
/** Resolve only profile identities supplied by an authoritative DSH service or Loader directory. */
export declare function resolveAwikiProfileName(ctx: Context, dshHome: string): string | undefined;
/** Preserve the historical fallback while isolating desktop/CLI profiles at the Host boundary. */
export declare function resolveAwikiStateRoot(ctx: Context, dshHome: string): string;
//# sourceMappingURL=profile-state.d.ts.map