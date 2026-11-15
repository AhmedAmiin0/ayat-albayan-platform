import { CLOCK_STORAGE_KEY, parseClockPref, resolveHourCycle, type ClockCycle, type ClockPref } from '@ab/shared';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useSyncExternalStore } from 'react';
import { deviceUses24 } from './device-clock';

// «تنسيق الوقت» (owner 2026-10-27): follow the phone, or 12 h / 24 h saved on this device under the
// same AsyncStorage as the language. A change re-renders every subscriber at once, no reload.

let pref: ClockPref = 'auto';
let device: boolean | null | undefined;
let restored = false;
/** Bumped by every choice: a slow first read must not undo one made meanwhile. */
let version = 0;
const listeners = new Set<() => void>();

const notify = () => listeners.forEach((listener) => listener());

/** The saved choice, read once; unreadable storage keeps «auto». */
async function restore(): Promise<void> {
  restored = true;
  const at = version;
  try {
    const saved = parseClockPref(await AsyncStorage.getItem(CLOCK_STORAGE_KEY));
    if (at === version && saved !== pref) {
      pref = saved;
      notify();
    }
  } catch {
    // Keep «auto».
  }
}

function subscribe(listener: () => void): () => void {
  listeners.add(listener);
  if (!restored) void restore();
  return () => void listeners.delete(listener);
}

/** The cycle in effect now (for code outside React); screens use useClockCycle(). */
export function clockCycle(): ClockCycle {
  if (device === undefined) device = deviceUses24();
  return resolveHourCycle(pref, device);
}

function clockPref(): ClockPref {
  return pref;
}

/** Applies at once, then saves; a failed save only loses the choice on the next start. */
export function setClockPref(next: ClockPref): void {
  pref = next;
  version += 1;
  notify();
  void AsyncStorage.setItem(CLOCK_STORAGE_KEY, next).catch(() => undefined);
}

/** The cycle every time on screen uses; re-renders when the setting changes. */
export function useClockCycle(): ClockCycle {
  return useSyncExternalStore(subscribe, clockCycle);
}

/** «تنسيق الوقت»: [saved choice, choose]. */
export function useClockPref(): [ClockPref, (next: ClockPref) => void] {
  // The hook on its own line, not inside the array: the React Compiler skipped hooks nested in an array literal (use-voice).
  const pref = useSyncExternalStore(subscribe, clockPref);
  return [pref, setClockPref];
}
