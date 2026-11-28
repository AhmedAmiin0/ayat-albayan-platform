// Stripe needs the API's FEATURE_STRIPE and VITE_FEATURE_STRIPE=1 (docs/30-stripe-test.md).

/** A Stripe build (VITE_FEATURE_STRIPE=1). Read at call time, so tests can stub the env. */
export const stripeBuild = (): boolean => import.meta.env.VITE_FEATURE_STRIPE === '1';
