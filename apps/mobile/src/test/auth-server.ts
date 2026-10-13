import AsyncStorage from '@react-native-async-storage/async-storage';
import { createClient } from '@supabase/supabase-js';

// The real auth-js client (its storage, refresh retries, commit guard and events) against a
// scripted auth server, for tests about races the stubs in jest.setup cannot show. Use it as
// jest.mock('@/lib/supabase', () => jest.requireActual('@/test/auth-server')).

/** auth-js's default key for http://auth.test: `sb-<first label of the host>-auth-token`. */
export const STORAGE_KEY = 'sb-auth-auth-token';

export interface Logout {
  bearer: string;
  scope: string;
}

interface ServerState {
  /** Off: every request fails as RN's fetch does offline (auth-js retries the refresh). */
  online: boolean;
  /** On: POST /logout is held until release(). */
  holdLogout: boolean;
  logouts: Logout[];
  /** Users whose refresh the server answered (rotated tokens it sent back). */
  refreshed: string[];
  held: (() => void)[];
}

export const server: ServerState = { online: true, holdLogout: false, logouts: [], refreshed: [], held: [] };

export function resetServer(): void {
  Object.assign(server, { online: true, holdLogout: false, logouts: [], refreshed: [], held: [] });
}

/** Answers every held /logout. */
export function release(): void {
  server.held.splice(0).forEach((answer) => answer());
}

/** A session as GoTrue returns it and auth-js stores it; `user` doubles as the user id. */
export function sessionFor(user: string, expiresIn: number, generation = 1) {
  return {
    access_token: `${user}-access-${generation}`,
    refresh_token: `${user}-refresh-${generation}`,
    token_type: 'bearer',
    expires_in: expiresIn,
    expires_at: Math.floor(Date.now() / 1000) + expiresIn,
    user: { id: user, aud: 'authenticated', role: 'authenticated', app_metadata: {}, user_metadata: {}, created_at: '' },
  };
}

/** The user whose session the device holds now, or null. */
export async function storedUser(): Promise<string | null> {
  const raw = await AsyncStorage.getItem(STORAGE_KEY);
  if (!raw) return null;
  const session: unknown = JSON.parse(raw);
  const user: unknown = Reflect.get(Object(session), 'user');
  const id: unknown = Reflect.get(Object(user), 'id');
  return typeof id === 'string' ? id : null;
}

const json = (body: unknown) => new Response(JSON.stringify(body), { status: 200 });

function logout(url: URL, headers: Headers): Promise<Response> {
  const bearer = (headers.get('Authorization') ?? '').replace('Bearer ', '');
  server.logouts.push({ bearer, scope: url.searchParams.get('scope') ?? '' });
  const answer = () => new Response(null, { status: 204 });
  if (!server.holdLogout) return Promise.resolve(answer());
  return new Promise((resolve) => server.held.push(() => resolve(answer())));
}

async function token(url: URL, body: string): Promise<Response> {
  const fields: unknown = JSON.parse(body);
  if (url.searchParams.get('grant_type') === 'password') {
    return json(sessionFor(String(Reflect.get(Object(fields), 'email')), 3600));
  }
  // A refresh rotates both tokens of the same user.
  const user = String(Reflect.get(Object(fields), 'refresh_token')).replace(/-refresh-\d+$/, '');
  server.refreshed.push(user);
  return json(sessionFor(user, 3600, 2));
}

async function respond(input: RequestInfo | URL, init: RequestInit = {}): Promise<Response> {
  if (!server.online) throw new TypeError('Network request failed');
  const url = new URL(input instanceof Request ? input.url : String(input));
  if (url.pathname === '/auth/v1/logout') return logout(url, new Headers(init.headers));
  if (url.pathname === '/auth/v1/token') return token(url, String(init.body));
  return new Response(JSON.stringify({ message: 'not scripted' }), { status: 404 });
}

/** No auto-refresh ticker (it would be a second, unscripted refresher) and no URL detection. */
export const supabase = createClient('http://auth.test', 'anon-key', {
  auth: { storage: AsyncStorage, persistSession: true, autoRefreshToken: false, detectSessionInUrl: false },
  global: { fetch: (input, init) => respond(input, init) },
});
