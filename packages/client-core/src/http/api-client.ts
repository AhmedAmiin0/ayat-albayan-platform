import { ApiError, readJson } from './api-error.js';
import { CLIENT_HEADER } from './client-header.js';

export type SendMethod = 'POST' | 'PUT' | 'PATCH' | 'DELETE';

/** What an app injects: where the API lives, the session token and its client tag (docs/26 §2f). */
export interface ApiClientOptions {
  /** The API origin, read on every call (tests and env switches). */
  baseUrl: () => string;
  /** The current access token, or null when signed out. */
  accessToken: () => Promise<string | null>;
  /** `web/<build>` or `mobile/<build>`. */
  clientTag: () => string;
  /** The transport; mobile wraps fetch to report reachability (connectivity). Default: global fetch. */
  fetch?: (url: string, init: RequestInit) => Promise<Response>;
}

export interface ApiClient {
  apiFetch<T>(path: string, init?: RequestInit): Promise<T>;
  apiSend<T = void>(method: SendMethod, path: string, body?: unknown): Promise<T>;
}

/** fetch against the Nest API with the access token and the client tag (`X-AB-Client`). */
export function createApiClient(opts: ApiClientOptions): ApiClient {
  async function apiFetch<T>(path: string, init: RequestInit = {}): Promise<T> {
    const token = await opts.accessToken();
    const headers = new Headers(init.headers);
    headers.set(CLIENT_HEADER, opts.clientTag());
    if (token) headers.set('Authorization', `Bearer ${token}`);
    const send = opts.fetch ?? fetch;
    const res = await send(`${opts.baseUrl()}${path}`, { ...init, headers });
    const body = await readJson(res);
    if (!res.ok) throw new ApiError(res.status, body ?? null);
    return body as T;
  }

  /** JSON mutation helper for TanStack Query `mutationFn`s. Resolves undefined on 204. */
  function apiSend<T = void>(method: SendMethod, path: string, body?: unknown): Promise<T> {
    const init: RequestInit = { method };
    if (body !== undefined) {
      init.headers = { 'Content-Type': 'application/json' };
      init.body = JSON.stringify(body);
    }
    return apiFetch<T>(path, init);
  }

  return { apiFetch, apiSend };
}
