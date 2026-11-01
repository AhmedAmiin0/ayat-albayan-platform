import type { HttpProfile, HttpRequest } from './http.types';

// The fetch arguments for one call. Nothing here goes into a failure but `whereOf`.

const ABSOLUTE = /^https?:\/\//;

/** base()/path (or the absolute path) plus the query, undefined values left out. */
export function urlOf(base: string, req: HttpRequest): string {
  const url = new URL(ABSOLUTE.test(req.path) ? req.path : `${base}/${req.path}`);
  Object.entries(req.query ?? {})
    .filter((entry): entry is [string, string | number] => entry[1] !== undefined)
    .forEach(([key, value]) => {
      url.searchParams.set(key, String(value));
    });
  return url.href;
}

/** «profile METHOD /path»: no host, no query (an absolute URL's query may hold a token). */
export function whereOf(name: string, req: HttpRequest): string {
  const path = new URL(req.path, 'http://local.invalid').pathname;
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
