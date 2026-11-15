import type { AuthChangeEvent, Session } from '@supabase/supabase-js';
import type { AppStateStatus } from 'react-native';
import { type BioWires, wireBioLock } from './bio-lock';
import type { BioLockStore } from './lock-store';

// What feeds the lock: the app's foreground state and the session's sign-in / sign-out events.

jest.unmock('./bio-lock');

type OnApp = (next: AppStateStatus) => void;
type OnAuth = (event: AuthChangeEvent, session: Session | null) => void;

function setup() {
  const lock = { show: jest.fn(), hide: jest.fn(), signedIn: jest.fn(), signedOut: jest.fn() };
  const heard: { app?: OnApp; auth?: OnAuth } = {};
  const wires = {
    appState: { addEventListener: (_: string, l: OnApp) => void (heard.app = l) },
    auth: { onAuthStateChange: (l: OnAuth) => void (heard.auth = l) },
    now: () => 42,
  } as unknown as BioWires;
  wireBioLock(lock as unknown as BioLockStore, wires);
  const app = (next: AppStateStatus) => heard.app?.(next);
  const auth = (event: AuthChangeEvent, session: Session | null) => heard.auth?.(event, session);
  return { lock, app, auth };
}

const session = {} as Session;

test('active shows; inactive (iOS switcher) and background both cover', () => {
  const s = setup();
  s.app('inactive');
  s.app('background');
  expect(s.lock.hide).toHaveBeenNthCalledWith(1, 42);
  expect(s.lock.hide).toHaveBeenCalledTimes(2);
  s.app('active');
  expect(s.lock.show).toHaveBeenCalledWith(42);
});

test('a fresh sign-in (no session before) asks for the offer', () => {
  const s = setup();
  s.auth('INITIAL_SESSION', null);
  s.auth('SIGNED_IN', session);
  expect(s.lock.signedIn).toHaveBeenCalledTimes(1);
});

test('a restored session never offers: SIGNED_IN before or after INITIAL_SESSION', () => {
  const s = setup();
  s.auth('SIGNED_IN', session);
  s.auth('INITIAL_SESSION', session);
  s.auth('SIGNED_IN', session);
  s.auth('TOKEN_REFRESHED', session);
  expect(s.lock.signedIn).not.toHaveBeenCalled();
});

test('every sign-out clears the lock; the next sign-in is fresh again', () => {
  const s = setup();
  s.auth('INITIAL_SESSION', session);
  s.auth('SIGNED_OUT', null);
  expect(s.lock.signedOut).toHaveBeenCalledTimes(1);
  s.auth('SIGNED_IN', session);
  expect(s.lock.signedIn).toHaveBeenCalledTimes(1);
});
