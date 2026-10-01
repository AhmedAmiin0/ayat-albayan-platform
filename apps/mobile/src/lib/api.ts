import { env } from './env';
import { supabase } from './supabase';

/** fetch against the Nest API with the current Supabase access token. */
export async function apiFetch<T>(path: string): Promise<T> {
  const { data } = await supabase.auth.getSession();
  const headers = new Headers();
  if (data.session) headers.set('Authorization', `Bearer ${data.session.access_token}`);
  const res = await fetch(`${env.apiUrl}${path}`, { headers });
  if (!res.ok) throw new Error(`API ${res.status}`);
  return (await res.json()) as T;
}
