import { Platform } from 'react-native';

// Inlined at bundle time; without it Stripe screens are dead code; the API flag still decides.
export const STRIPE_FEATURE = process.env.EXPO_PUBLIC_FEATURE_STRIPE === '1';

/** use-stripe.ts reads it; saving integrations invalidates it. */
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
