// «رابط دفع» (owner 2026-10-28, docs/30-stripe-test.md): Stripe exists ONLY in the test build. Every piece
// of its UI also waits for the API (useStripeFeature); a normal build has no VITE_FEATURE_STRIPE, so this is false.

/** The Stripe test build (VITE_FEATURE_STRIPE=1). Read at call time, so tests can stub the env. */
export const stripeBuild = (): boolean => import.meta.env['VITE_FEATURE_STRIPE'] === '1';
