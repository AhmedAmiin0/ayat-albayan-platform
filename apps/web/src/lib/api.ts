import { env } from './env';
import { supabase } from './supabase';

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

/** fetch against the Nest API with the current Supabase access token. */
export async function apiFetch<T>(path: string, init: RequestInit = {}): Promise<T> {
  const { data } = await supabase.auth.getSession();
  const headers = new Headers(init.headers);
  if (data.session) headers.set('Authorization', `Bearer ${data.session.access_token}`);
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
