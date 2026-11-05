/**
 * The API's public base URL (env API_PUBLIC_URL, e.g. https://api.ayatalbayan.com; docs/09): the
 * family's
 * pages (/pay/<token>, its checkout, done and cancelled pages) and the short links (/r/<code>) are
 * served
 * by the API itself. Unset or not an http(s) URL = this process on localhost (local dev only).
 */
export function apiPublicOrigin(env: NodeJS.ProcessEnv = process.env): string {
  const raw = (env.API_PUBLIC_URL ?? '').trim().replace(/\/+$/, '');
  return /^https?:\/\/[^/\s]+$/.test(raw) ? raw : `http://localhost:${env.PORT ?? '3000'}`;
}
