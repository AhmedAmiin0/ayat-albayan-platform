import AsyncStorage from '@react-native-async-storage/async-storage';
import { act, renderRouter } from 'expo-router/testing-library';
import type { AccessToken as Token, ReadWithin as Within } from '@ab/mobile-kit/testing';
import { queryClient, pathKey } from '@ab/mobile-kit';
import type { ZodType } from 'zod';
import type { NavState } from '@/core/nav/chat-groups';
import { currentBackend, type FakeBackend, setBackend } from './fake-backend';
import type * as Backend from './fake-backend';
import { resetNative } from './native-mocks';
import { routes } from './app-routes';
import { fullAccessMe } from './staff-me';

// Flow-test harness: the REAL root + tabs layouts and the REAL route modules (app/**), driven by
// expo-router's renderRouter, over an in-memory API (fake-backend). Only the edges are doubled:
// the auth gate (a settable status, as nav/routing.test does), fonts, Supabase (session + the
// receipt bucket) and the native push / camera modules. Import this file FIRST in a flow test:
// its jest.mock calls must run before any app module loads.

jest.mock('expo-font', () => ({ useFonts: () => [true, null] }));
jest.mock('expo-device', () => jest.requireActual('./native-mocks').deviceMock());
jest.mock('expo-notifications', () => jest.requireActual('./native-mocks').notificationsMock());
jest.mock('expo-image-picker', () => jest.requireActual('./native-mocks').imagePickerMock());
jest.mock('@ab/mobile-kit/lib/http/api', () => ({
  ...jest.requireActual('@ab/mobile-kit/lib/http/api'),
  // The real read deadline and token read around the fake answer (stuck reads).
  apiFetch: (url: string, init: RequestInit & { schema?: ZodType } = {}) => {
    const token = jest.requireActual<typeof Token>('@ab/mobile-kit/lib/http/access-token');
    const within = jest.requireActual<typeof Within>('@ab/mobile-kit/lib/http/read-within');
    const backend = () => jest.requireActual<typeof Backend>('./fake-backend');
    const { schema, ...rest } = init;
    const read = async () => {
      await token.accessToken();
      return backend().currentBackend().fetch(url, schema);
    };
    return within.withReadDeadline(read, rest);
  },
  apiSend: (method: string, url: string, options?: unknown) =>
    jest.requireActual('./fake-backend').currentBackend().send(method, url, options),
}));
jest.mock('@ab/mobile-kit/lib/http/supabase', () => ({
  supabase: {
    auth: {
      getSession: jest.fn(async () => ({ data: { session: null }, error: null })),
      onAuthStateChange: jest.fn(() => ({ data: { subscription: { unsubscribe: jest.fn() } } })),
      // Records the call; the test then flips the gate (app.setGate('out')), as the real
      // onAuthStateChange would.
      signOut: jest.fn(async () => ({ error: null })),
    },
    storage: {
      from: (bucket: string) => ({
        uploadToSignedUrl: async (path: string) => {
          jest.requireActual('./fake-backend').currentBackend().uploads.push({ bucket, path });
          return { data: { path }, error: null };
        },
      }),
    },
  },
}));
jest.mock('@ab/mobile-kit/auth/use-auth-gate', () => {
  const { useState } = jest.requireActual('react');
  const gate = { initial: 'out', set: (() => undefined) as (mockStatus: string) => void };
  return {
    mockGate: gate,
    useAuthGate: () => {
      const [status, set] = useState(gate.initial);
      gate.set = set;
      return status;
    },
  };
});
const { mockGate } = jest.requireMock<{
  mockGate: { initial: string; set: (status: string) => void };
}>('@ab/mobile-kit/auth/use-auth-gate');

interface AppOptions {
  url: string;
  backend: FakeBackend;
  /** Who is signed in (default admin). */
  gate?: 'admin' | 'teacher' | 'sales' | 'out';
  /** AsyncStorage keys present at boot (e.g. the saved language). */
  storage?: Record<string, string>;
}

/** Call from beforeEach: nothing of the previous test (cache, disk, native doubles) survives. */
export async function resetApp(): Promise<void> {
  jest.clearAllMocks();
  resetNative();
  queryClient.clear();
  await AsyncStorage.clear();
}

export async function renderApp({ url, backend, gate = 'admin', storage = {} }: AppOptions) {
  // Staff holding every permission unless the test answers GET /auth/me itself (staff-me.ts); seeded as
  // verifyRole does before the gate opens a tree, so the tab bar is there on the first render.
  const own = backend.handles('GET /auth/me');
  const me = fullAccessMe(gate === 'out' ? 'admin' : gate);
  setBackend(own ? backend : backend.fallback('GET /auth/me', () => me));
  if (!own && gate !== 'out' && !queryClient.getQueryData(pathKey('/auth/me')))
    queryClient.setQueryData(pathKey('/auth/me'), me);
  mockGate.initial = gate;
  await AsyncStorage.multiSet(Object.entries(storage));
  const pending = renderRouter(routes, { initialUrl: url });
  await pending;
  return {
    pathname: () => pending.getPathname(),
    /** The route segments, groups included: [0] is '(tabs)' or '(admin-chat)'. */
    segments: () => pending.getSegments(),
    /** The root layout's stack, bottom → top (under expo-router's own '__root' slot). */
    stack: () => {
      const root: NavState | undefined = pending.getRouterState();
      return root?.routes[0]?.state?.routes.map((r) => r.name) ?? [];
    },
    backend: currentBackend(),
    setGate: (status: string) => act(async () => mockGate.set(status)),
  };
}
