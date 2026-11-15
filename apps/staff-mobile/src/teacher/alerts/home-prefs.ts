import { DEFAULT_HOME_PREFS, HOME_PREFS_KEY, type HomePrefs, parseHomePrefs } from '@ab/client-core';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useSyncExternalStore } from 'react';

// «تخصيص» of the teacher's «اليوم» (owner 2026-11-14), saved on this device under the same
// AsyncStorage as the language and the clock (a server copy is a later option). Unreadable
// storage keeps the defaults: everything on, comfortable rows.

let prefs: HomePrefs = DEFAULT_HOME_PREFS;
let restored = false;
/** Bumped by every choice: a slow first read must not undo one made meanwhile. */
let version = 0;
const listeners = new Set<() => void>();

const notify = () => listeners.forEach((listener) => listener());

async function restore(): Promise<void> {
  restored = true;
  const at = version;
  try {
    const saved = parseHomePrefs(await AsyncStorage.getItem(HOME_PREFS_KEY));
    if (at !== version) return;
    prefs = saved;
    notify();
  } catch {
    // Keep the defaults.
  }
}

function subscribe(listener: () => void): () => void {
  listeners.add(listener);
  if (!restored) void restore();
  return () => void listeners.delete(listener);
}

const current = (): HomePrefs => prefs;

/** Applies at once, then saves; a failed save only loses the choice on the next start. */
export function saveHomePrefs(next: HomePrefs): void {
  prefs = next;
  version += 1;
  notify();
  void AsyncStorage.setItem(HOME_PREFS_KEY, JSON.stringify(next)).catch(() => undefined);
}

/** Tests: forget what was read so the next subscriber reads storage again. */
export function resetHomePrefs(): void {
  prefs = DEFAULT_HOME_PREFS;
  restored = false;
  version = 0;
}

/** The saved choices; every reader re-renders on a change. */
export const useHomePrefs = (): HomePrefs => useSyncExternalStore(subscribe, current);
