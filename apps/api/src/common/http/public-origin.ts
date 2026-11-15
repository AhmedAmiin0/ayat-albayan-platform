import { z } from 'zod';

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

/** The web app's origin: the first of WEB_ORIGIN (a comma list), no trailing slash. */
export const firstOrigin = (webOrigin: string): string =>
  (webOrigin.split(',')[0] ?? '').trim().replace(/\/+$/, '');

const ORIGIN = /^https?:\/\/[^/\s,]+\/*$/;

/**
 * WEB_ORIGIN: a comma list of the web apps' origins, the staff app (app.) FIRST, the family web
 * app after it (docs/51 §4). Links in messages use the first, so it must be an http(s) origin
 * (a leading comma or a bare host fails the boot).
 */
export const webOrigin = z
  .string()
  .default('http://localhost:5173')
  .refine((v) => ORIGIN.test((v.split(',')[0] ?? '').trim()), {
    message: 'WEB_ORIGIN: the first entry must be an http(s) origin',
  });
