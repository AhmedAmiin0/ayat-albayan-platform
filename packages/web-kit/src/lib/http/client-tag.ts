import { z } from 'zod';

const BUILD = z.string().regex(/^[A-Za-z0-9._+-]{1,40}$/).catch('dev');
const APP = z.enum(['web', 'family-web']).catch('web');

/** A build id the API can count: letters, digits and `._+-`, at most 40; anything else is 'dev'. */
export function sanitizeBuild(raw: unknown): string {
  return BUILD.parse(raw);
}

/** `<app>/<build>`: an unknown app is the staff app (`web`), a missing or malformed build `dev`. */
export function buildClientTag(app: unknown, build: unknown): string {
  return `${APP.parse(app)}/${BUILD.parse(build)}`;
}

/**
 * The `X-AB-Client` header value (docs/26 §2f). The app name comes from the web config (`client`),
 * the build from VITE_BUILD_ID, which the deploy sets to the commit's short sha; local and test
 * builds say `<app>/dev`.
 */
export const WEB_CLIENT_TAG = buildClientTag(
  import.meta.env.VITE_CLIENT_APP,
  import.meta.env.VITE_BUILD_ID,
);

export { CLIENT_HEADER } from '@ab/client-core';
