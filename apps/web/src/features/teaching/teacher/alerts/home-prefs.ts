import { DEFAULT_HOME_PREFS, HOME_PREFS_KEY, type HomePrefs, parseHomePrefs } from '@ab/client-core';
import { useSyncExternalStore } from 'react';

// «تخصيص» of the teacher's «اليوم» (owner 2026-11-14), saved in this browser only (a server copy
// is a later option). Blocked storage (private mode) keeps the defaults for this page view.

let prefs: HomePrefs | null = null;
const listeners = new Set<() => void>();

function readSaved(): HomePrefs {
  try {
    return parseHomePrefs(localStorage.getItem(HOME_PREFS_KEY));
  } catch {
    return DEFAULT_HOME_PREFS;
  }
}

const current = (): HomePrefs => {
  prefs ??= readSaved();
  return prefs;
};

function subscribe(listener: () => void): () => void {
  listeners.add(listener);
  return () => void listeners.delete(listener);
}

/** Applies at once, then saves; a refused save keeps the choice for this page view. */
export function saveHomePrefs(next: HomePrefs): void {
  prefs = next;
  try {
    localStorage.setItem(HOME_PREFS_KEY, JSON.stringify(next));
  } catch {
    // storage blocked
  }
  listeners.forEach((listener) => listener());
}

/** Forget the cached read (tests, another tab's write). */
export const reloadHomePrefs = (): void => {
  prefs = null;
};

/** The saved choices; every reader re-renders on a change. */
export const useHomePrefs = (): HomePrefs => useSyncExternalStore(subscribe, current);
