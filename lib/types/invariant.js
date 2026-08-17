/** Package-owned invariant companion for `@awiki/dsh`. */
const PACKAGE_NAME = '@awiki/dsh';
/** Cordis companion plugin name. */
export const name = 'awiki-invariant';
/** Service required before the companion can reserve package ownership. */
export const inject = ['invariants'];
/**
 * No runtime invariant: the private single-provider slot is validated during
 * registration, and SDK request/result relationships are owned by the provider.
 */
const install = () => { };
/** Register this package's invariant companion. */
export const apply = (ctx) => Promise.resolve(ctx.invariants.register(PACKAGE_NAME, install));
//# sourceMappingURL=invariant.js.map