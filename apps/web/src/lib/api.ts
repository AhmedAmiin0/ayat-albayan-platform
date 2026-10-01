import { env } from './env';
import { supabase } from './supabase';

export class ApiError extends Error {
  constructor(readonly status: number) {
    super(`API ${status}`);
  }
}

/** fetch against the Nest API with the current Supabase access token. */
export async function apiFetch<T>(path: string, init: RequestInit = {}): Promise<T> {
  const { data } = await supabase.auth.getSession();
  const headers = new Headers(init.headers);
  if (data.session) headers.set('Authorization', `Bearer ${data.session.access_token}`);
  const res = await fetch(`${env.apiUrl}${path}`, { ...init, headers });
  if (!res.ok) throw new ApiError(res.status);
  return (await res.json()) as T;
}
