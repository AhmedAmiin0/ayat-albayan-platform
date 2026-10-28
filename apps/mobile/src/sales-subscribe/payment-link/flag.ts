// «رابط دفع» exists ONLY in the Stripe test build (owner 2026-10-28, docs/30). Expo inlines EXPO_PUBLIC_*
// at bundle time: eas.json's `stripe-test` profile alone sets it to '1', so in preview / production this is
// `false` and every Stripe screen and pill below is dead code that asks nothing (app-config.stripe.test.ts).
export const STRIPE_FEATURE = process.env.EXPO_PUBLIC_FEATURE_STRIPE === '1';
