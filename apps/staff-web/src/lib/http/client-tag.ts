/** A build id the API can count: letters, digits and `._+-`, at most 40 characters; anything else is 'dev'. */
export function sanitizeBuild(raw: unknown): string {
  return typeof raw === 'string' && /^[A-Za-z0-9._+-]{1,40}$/.test(raw) ? raw : 'dev';
}

/**
 * The `X-AB-Client` header value (docs/26 §2f, retiring an alias): `web/<build>`. The build comes
 * from VITE_BUILD_ID at build time (the commit sha in CI); local and test builds say `web/dev`.
 */
export const WEB_CLIENT_TAG = `web/${sanitizeBuild(import.meta.env['VITE_BUILD_ID'])}`;

export { CLIENT_HEADER } from '@ab/client-core';
