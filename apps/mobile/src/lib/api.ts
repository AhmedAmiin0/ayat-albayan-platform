import { env } from './env';
import { supabase } from './supabase';

// Same shape as apps/web/src/lib/api.ts on purpose: one mental model for both apps.

/** Non-2xx API response. `body` is the parsed JSON error (e.g. duplicate candidates on 409), if any. */
export class ApiError extends Error {
  constructor(
    readonly status: number,
    readonly body: unknown = null,
  ) {
    super(`API ${status}`);
  }
}

async function readJson(res: Response): Promise<unknown> {
  const text = await res.text();
  if (!text) return undefined;
  try {
    return JSON.parse(text);
  } catch {
    return text;
  }
}

/**
 * fetch against the Nest API with the current Supabase access token. A caller's own Authorization
 * wins and the session is not read (sign-out's DELETE names the leaving session, never a later one).
 */
export async function apiFetch<T>(path: string, init: RequestInit = {}): Promise<T> {
  const headers = new Headers(init.headers);
  if (!headers.has('Authorization')) {
    const { data } = await supabase.auth.getSession();
    if (data.session) headers.set('Authorization', `Bearer ${data.session.access_token}`);
  }
  const res = await fetch(`${env.apiUrl}${path}`, { ...init, headers });
  const body = await readJson(res);
  if (!res.ok) throw new ApiError(res.status, body ?? null);
  return body as T;
}

export type SendMethod = 'POST' | 'PUT' | 'PATCH' | 'DELETE';

/** JSON mutation helper for TanStack Query `mutationFn`s. Resolves undefined on 204. */
export function apiSend<T = void>(method: SendMethod, path: string, body?: unknown): Promise<T> {
  const init: RequestInit = { method };
  if (body !== undefined) {
    init.headers = { 'Content-Type': 'application/json' };
    init.body = JSON.stringify(body);
  }
  return apiFetch<T>(path, init);
}

/** `?a=1&b=x` from defined values only (RN's URLSearchParams is partial, so no dependency on it). */
export function toQueryString(params: Record<string, string | number | undefined>): string {
  const parts = Object.entries(params)
    .filter(
      (entry): entry is [string, string | number] => entry[1] !== undefined && entry[1] !== '',
    )
    .map(([k, v]) => `${encodeURIComponent(k)}=${encodeURIComponent(String(v))}`);
  return parts.length ? `?${parts.join('&')}` : '';
}
