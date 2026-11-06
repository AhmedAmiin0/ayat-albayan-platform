import { ApiError, readJson } from './api-error.js';
import { CLIENT_HEADER } from './client-header.js';
import { type StallStage, withDeadline } from './deadline.js';
import { sendTimeoutFor } from './timeouts.js';

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
  /** A write passed its deadline (mobile tells its connection state). Default: nothing. */
  onStall?: (stage: StallStage) => void;
}

/** One write: apiSend's arguments plus the caller's signal (its abort ends the write at once). */
export interface SendRequest {
  method: SendMethod;
  path: string;
  body?: unknown;
  signal?: AbortSignal | null | undefined;
}

export interface ApiClient {
  apiFetch<T>(path: string, init?: RequestInit): Promise<T>;
  apiSend<T = void>(method: SendMethod, path: string, body?: unknown): Promise<T>;
}

/** apiSend with the caller's signal (an abort ends the write at once). */
type SendWithSignal = <T = void>(req: SendRequest) => Promise<T>;

const ignore = (): void => undefined;

/** fetch against the Nest API with the access token and the client tag (`X-AB-Client`). */
export function createApiClient(
  opts: ApiClientOptions,
): ApiClient & { apiRequest: SendWithSignal } {
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

  /**
   * JSON mutation helper for TanStack Query `mutationFn`s. Resolves undefined on 204. Bounded
   * (docs/43 AU10): no answer within sendTimeoutFor(path), token included, rejects as no answer
   * (`TypeError`) and aborts the fetch; isNoAnswer tells that from the API's refusal.
   */
  function apiRequest<T = void>(req: SendRequest): Promise<T> {
    const init: RequestInit = { method: req.method };
    if (req.body !== undefined) {
      init.headers = { 'Content-Type': 'application/json' };
      init.body = JSON.stringify(req.body);
    }
    const send = (signal: AbortSignal) => apiFetch<T>(req.path, { ...init, signal });
    const timeoutMs = sendTimeoutFor(req.path);
    return withDeadline(send, { signal: req.signal, onTimeout: opts.onStall ?? ignore, timeoutMs });
  }

  const apiSend = <T = void>(method: SendMethod, path: string, body?: unknown): Promise<T> =>
    apiRequest<T>({ method, path, body });

  return { apiFetch, apiSend, apiRequest };
}
