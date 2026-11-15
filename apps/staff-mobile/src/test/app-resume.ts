import { act } from '@testing-library/react-native';
import { AppState, type AppStateStatus } from 'react-native';
import type { FakeBackend } from '@/test/fake-backend';

// Resume flows (owner 2026-11-05, «I don't see the updated chat even after a push»): AppState is
// driven by hand, and a backend route can hang (a read stuck on a dead connection) until released.

type Change = (state: AppStateStatus) => void;
const changes = new Set<Change>();

/** Every AppState 'change' listener added from now on is kept, so the test can switch the app. */
export function captureAppState(): void {
  changes.clear();
  Object.defineProperty(AppState, 'currentState', { value: 'active', configurable: true });
  jest.spyOn(AppState, 'addEventListener').mockImplementation((_type, fn) => {
    const change = fn;
    changes.add(change);
    return { remove: () => changes.delete(change) };
  });
}

async function switchTo(state: AppStateStatus): Promise<void> {
  Object.defineProperty(AppState, 'currentState', { value: state, configurable: true });
  await act(() => {
    for (const change of [...changes]) change(state);
  });
}

/** The phone locks (or another app opens), then the app is opened again. */
export async function backgroundThenActive(): Promise<void> {
  await switchTo('background');
  await switchTo('active');
}

/** Matching GETs hang (no answer, no error) while held; `release` answers new ones again. */
export function stallReads(backend: FakeBackend, match: (url: string) => boolean) {
  const real = backend.fetch;
  let held = true;
  const stalled: string[] = [];
  backend.fetch = (url: string) => {
    if (!held || !match(url)) return real(url);
    stalled.push(url);
    return new Promise<never>(() => undefined);
  };
  return {
    stalled,
    release: () => {
      held = false;
    },
  };
}

/** The chats list's page read (not the badge's pageSize=1 count). */
export const isListRead = (url: string): boolean =>
  url.startsWith('/threads?') && url.includes('pageSize=25');

/** A chat's own read (GET /threads/:phone, any page). */
export const isThreadRead = (phone: string) => (url: string): boolean =>
  url.startsWith(`/threads/${encodeURIComponent(phone)}`);

/** A push about this chat as it arrives with the app in the foreground (refreshInbox runs). */
export const pushArrives = (phone: string) => ({
  request: { content: { data: { kind: 'new_message', phone } } },
});

/** The same push, tapped. */
export const pushTapped = (phone: string) => ({
  notification: { request: { content: { data: { kind: 'new_message', phone } } } },
});
