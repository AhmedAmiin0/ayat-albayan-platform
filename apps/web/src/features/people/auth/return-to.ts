import { z } from 'zod';

/**
 * The page a signed-out user was bounced from (owner 2026-11-14: the teacher's report link returns
 * to its lesson after sign-in). Same-origin relative paths only: starts with "/", not "//" or "/\",
 * no backslash or whitespace (a browser drops tabs and newlines, so "/\t/x" would become "//x").
 */
const SAFE_RETURN = /^\/(?![/\\])[^\\\s]*$/u;

/** Is `path` a same-origin path the app may navigate to after sign-in? */
export const isSafeReturn = (path: string): boolean => SAFE_RETURN.test(path);

const returnSearch = z.object({ redirect: z.string().optional() }).catch({});

/** `?redirect=<path>` on /login and /account-setup; an unsafe or malformed value is dropped. */
export function parseReturnSearch(search: Record<string, unknown>): { redirect?: string } {
  const back = returnSearch.parse(search).redirect ?? '';
  return isSafeReturn(back) ? { redirect: back } : {};
}

/** `back` as the `?redirect=` a guard's bounce carries ({} when absent or unsafe). */
export const returnSearchOf = (back?: string): { redirect?: string } =>
  parseReturnSearch({ redirect: back });

/** Where to land after sign-in (or the first-time setup): the safe destination, else `home`. */
export const afterSignIn = (home: string, back?: string): string =>
  back !== undefined && isSafeReturn(back) ? back : home;
