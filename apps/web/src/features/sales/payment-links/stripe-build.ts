// «رابط دفع» (owner 2026-10-28, go live 2026-11-01, docs/30-stripe-test.md): Stripe exists only with the API's
// FEATURE_STRIPE (test or live). The production web build sets VITE_FEATURE_STRIPE=1 (deploy-staging.yml); every
// piece of its UI also waits for the API (useStripeFeature). A build without VITE_FEATURE_STRIPE: this is false.

/** A Stripe build (VITE_FEATURE_STRIPE=1). Read at call time, so tests can stub the env. */
export const stripeBuild = (): boolean => import.meta.env['VITE_FEATURE_STRIPE'] === '1';
