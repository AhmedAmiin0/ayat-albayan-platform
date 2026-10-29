// «رابط دفع» exists ONLY in the Stripe test build (owner 2026-10-28, docs/30). Expo inlines EXPO_PUBLIC_*
// at bundle time: eas.json's `stripe-test` profile alone sets it to '1', so in preview / production this is
// `false` and every Stripe screen and pill is dead code that asks nothing (app-config.stripe.test.ts).
// Here in core (sales-subscribe/payment-link/flag.ts re-exports it) because the chats open pay links too.
export const STRIPE_FEATURE = process.env.EXPO_PUBLIC_FEATURE_STRIPE === '1';

/** The platform's pay page, https://<host>/pay/<token>, with nothing after the token. */
const PAY_PAGE = /^https?:\/\/[^/?#]+\/pay\/[A-Za-z0-9_-]{32,64}$/;

/**
 * The URL the app opens for `href`: a pay page gets ?from=app in the test build (`on`), so after Stripe the
 * page can bring the payer back into the app (owner 2026-10-29). Anything else, and every other build, is
 * unchanged; the text sent to a family never carries it.
 */
export const appOpenUrl = (href: string, on: boolean): string => (on && PAY_PAGE.test(href) ? `${href}?from=app` : href);
