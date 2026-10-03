import AsyncStorage from '@react-native-async-storage/async-storage';
import { act, renderRouter } from 'expo-router/testing-library';
import { queryClient } from '@/lib/query-client';
import { currentBackend, type FakeBackend, useBackend } from './fake-backend';
import { resetNative } from './native-mocks';
import { routes } from './app-routes';

// Flow-test harness: the REAL root + tabs layouts and the REAL route modules (app/**), driven by
// expo-router's renderRouter, over an in-memory API (fake-backend). Only the edges are doubled:
// the auth gate (a settable status, as nav/routing.test does), fonts, Supabase (session + the
// receipt bucket) and the native push / camera modules. Import this file FIRST in a flow test:
// its jest.mock calls must run before any app module loads.

jest.mock('expo-font', () => ({ useFonts: () => [true, null] }));
jest.mock('expo-device', () => require('./native-mocks').deviceMock());
jest.mock('expo-notifications', () => require('./native-mocks').notificationsMock());
jest.mock('expo-image-picker', () => require('./native-mocks').imagePickerMock());
jest.mock('@/lib/api', () => ({
  ...jest.requireActual('@/lib/api'),
  apiFetch: (url: string) => require('./fake-backend').currentBackend().fetch(url),
  apiSend: (method: string, url: string, body?: unknown) =>
    require('./fake-backend').currentBackend().send(method, url, body),
}));
jest.mock('@/lib/supabase', () => ({
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
          require('./fake-backend').currentBackend().uploads.push({ bucket, path });
          return { data: { path }, error: null };
        },
      }),
    },
  },
}));
jest.mock('@/auth/use-auth-gate', () => {
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
const { mockGate } = jest.requireMock('@/auth/use-auth-gate') as {
  mockGate: { initial: string; set: (status: string) => void };
};

export interface AppOptions {
  url: string;
  backend: FakeBackend;
  /** Who is signed in (default admin). */
  gate?: 'admin' | 'teacher' | 'out';
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
  useBackend(backend);
  mockGate.initial = gate;
  await AsyncStorage.multiSet(Object.entries(storage));
  const pending = renderRouter(routes, { initialUrl: url });
  await pending;
  return {
    pathname: () => pending.getPathname(),
    backend: currentBackend(),
    setGate: (status: string) => act(async () => mockGate.set(status)),
  };
}
