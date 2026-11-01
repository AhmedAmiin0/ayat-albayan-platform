import type { HttpProfile, HttpRequest } from './http.types';

// The fetch arguments for one call. Nothing here goes into a failure but `whereOf`.

const ABSOLUTE = /^https?:\/\//;

const joined = (base: string, path: string): string => (path === '' ? base : `${base}/${path}`);

/** base()/path (or the absolute path; '' is base() itself) plus the query, undefined left out. */
export function urlOf(base: string, req: HttpRequest): string {
  const url = new URL(ABSOLUTE.test(req.path) ? req.path : joined(base, req.path));
  Object.entries(req.query ?? {})
    .filter((entry): entry is [string, string | number] => entry[1] !== undefined)
    .forEach(([key, value]) => {
      url.searchParams.set(key, String(value));
    });
  return url.href;
}

const LOCAL = 'http://local.invalid';

/** The path alone; a path that is no URL at all names nothing (its text may hold a token). */
const pathOf = (path: string): string =>
  URL.canParse(path, LOCAL) ? new URL(path, LOCAL).pathname : '<invalid path>';

/**
 * «profile METHOD /path»: never base(), the host or the query (an absolute URL's query, or a
 * keyed base such as FX_API_URL, may hold a secret).
 */
export function whereOf(name: string, req: HttpRequest): string {
  const path = pathOf(req.path);
  return `${name} ${req.method ?? 'GET'} ${path}`;
}

function bodyOf(req: HttpRequest): { body?: RequestInit['body']; type: Record<string, string> } {
  const json = req.json === undefined ? undefined : JSON.stringify(req.json);
  const type: Record<string, string> =
    json === undefined ? {} : { 'content-type': 'application/json' };
  return { body: req.raw ?? json, type };
}

interface InitInput<E extends Error> {
  profile: HttpProfile<E>;
  req: HttpRequest;
  /** The profile's headers, already read. */
  headers: Record<string, string>;
}

export function initOf<E extends Error>(input: InitInput<E>, signal: AbortSignal): RequestInit {
  const { body, type } = bodyOf(input.req);
  return {
    method: input.req.method ?? 'GET',
    headers: { ...input.headers, ...type, ...input.req.headers },
    body,
    redirect: input.profile.redirect,
    signal,
  };
}
