// An in-memory stand-in for the Nest API behind @/lib/api, for the multi-screen flow tests.
// Handlers match "METHOD /path/:param"; every call is recorded; an unknown route rejects loudly.

export interface Req {
  method: string;
  path: string;
  params: Record<string, string>;
  query: Record<string, string>;
  body: unknown;
}
export type Handler = (req: Req) => unknown;
export interface Call {
  method: string;
  path: string;
  query: Record<string, string>;
  body: unknown;
}

const split = (url: string) => {
  const [path = '', qs = ''] = url.split('?');
  const query: Record<string, string> = {};
  for (const pair of qs.split('&').filter(Boolean)) {
    const [k = '', v = ''] = pair.split('=');
    query[decodeURIComponent(k)] = decodeURIComponent(v);
  }
  return { path, query };
};

function match(pattern: string, path: string): Record<string, string> | null {
  const want = pattern.split('/');
  const got = path.split('/');
  if (want.length !== got.length) return null;
  const params: Record<string, string> = {};
  for (const [i, part] of want.entries()) {
    const seg = got[i] ?? '';
    if (part.startsWith(':')) params[part.slice(1)] = decodeURIComponent(seg);
    else if (part !== seg) return null;
  }
  return params;
}

export class FakeBackend {
  readonly calls: Call[] = [];
  /** Receipt files that reached Storage (the supabase stub records them). */
  readonly uploads: { bucket: string; path: string }[] = [];
  private readonly handlers: [string, Handler][] = [];
  private readonly failures = new Map<string, unknown[]>();

  on(route: string, handler: Handler): this {
    this.handlers.unshift([route, handler]);
    return this;
  }

  /** Does the test answer `route` itself (an `on` handler)? */
  handles(route: string): boolean {
    return this.handlers.some(([r]) => r === route);
  }

  /** Answers `route` only when no `on` handler matches (a default the test can override). */
  fallback(route: string, handler: Handler): this {
    this.handlers.push([route, handler]);
    return this;
  }

  /** The next `route` call rejects with `error` (then it behaves normally again). */
  failOnce(route: string, error: unknown): this {
    this.failures.set(route, [...(this.failures.get(route) ?? []), error]);
    return this;
  }

  /** Calls of one route, e.g. sent('POST /payments'). */
  sent(route: string): Call[] {
    const [method = '', pattern = ''] = route.split(' ');
    return this.calls.filter((c) => c.method === method && match(pattern, c.path) !== null);
  }

  async handle(method: string, url: string, body?: unknown): Promise<unknown> {
    const { path, query } = split(url);
    this.calls.push({ method, path, query, body });
    for (const [route, handler] of this.handlers) {
      const [m = '', pattern = ''] = route.split(' ');
      const params = m === method ? match(pattern, path) : null;
      if (!params) continue;
      const queued = this.failures.get(route);
      if (queued?.length) return Promise.reject(queued.shift());
      return handler({ method, path, params, query, body });
    }
    throw new Error(`fake backend: unexpected ${method} ${url}`);
  }

  fetch = (url: string): Promise<unknown> => this.handle('GET', url);
  send = (method: string, url: string, body?: unknown): Promise<unknown> =>
    this.handle(method, url, body);
}

let active = new FakeBackend();
export const setBackend = (backend: FakeBackend): void => {
  active = backend;
};
export const currentBackend = (): FakeBackend => active;
