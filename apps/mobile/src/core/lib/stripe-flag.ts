import { Platform } from 'react-native';

// «رابط دفع» exists only in a Stripe build (owner 2026-10-28, go live 2026-11-01, docs/30). Expo inlines
// EXPO_PUBLIC_* at bundle time: eas.json's `preview` and `stripe-test` profiles and mobile.yml's OTA set it to
// '1' (app-config.stripe.test.ts); a build without it has every Stripe screen and pill as dead code that asks
// nothing. Even with it, GET /stripe/feature decides (use-stripe.ts). Here in core
// (sales-subscribe/payment-link/flag.ts re-exports it) because the chats open pay links too.
export const STRIPE_FEATURE = process.env.EXPO_PUBLIC_FEATURE_STRIPE === '1';

/** GET /stripe/feature's query key: use-stripe.ts reads it, an «التكاملات» save invalidates it. */
export const STRIPE_FEATURE_KEY = ['stripe', 'feature'] as const;

/** The platform's pay page, https://<host>/pay/<token>, with nothing after the token. */
const PAY_PAGE = /^https?:\/\/[^/?#]+\/pay\/[A-Za-z0-9_-]{32,64}$/;

/**
 * The URL the app opens for `href`: a pay page gets ?from=<Platform.OS> in a Stripe build (`on`), so after
 * Stripe the page can bring the payer back into the app (owner 2026-10-29): 'android' gets an intent naming
 * the app (FEATURE_STRIPE=live: the normal one, test: the Stripe test app), 'ios' the scheme (the API never guesses from the User-Agent). Anything else, and every other
 * build, is unchanged; the text sent to a family never carries it.
 */
export const appOpenUrl = (href: string, on: boolean): string =>
  on && PAY_PAGE.test(href) ? `${href}?from=${Platform.OS}` : href;
