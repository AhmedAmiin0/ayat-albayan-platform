import { parseSeen, SEEN_REPORTS_KEY, withSeen } from '@ab/client-core';
import { useSyncExternalStore } from 'react';

// docs/50 §6: opened ids live in this browser only; blocked storage keeps them for this view.

let seen: string[] | null = null;
const listeners = new Set<() => void>();

function readSaved(): string[] {
  try {
    return parseSeen(localStorage.getItem(SEEN_REPORTS_KEY));
  } catch {
    return [];
  }
}

const current = (): string[] => {
  seen ??= readSaved();
  return seen;
};

function subscribe(listener: () => void): () => void {
  listeners.add(listener);
  return () => void listeners.delete(listener);
}

/** Marks a report opened: at once on every reader, then saved. */
export function markReportSeen(id: string): void {
  seen = withSeen(current(), id);
  try {
    localStorage.setItem(SEEN_REPORTS_KEY, JSON.stringify(seen));
  } catch {
    // storage blocked
  }
  listeners.forEach((listener) => listener());
}

/** Forget the cached read (tests, another tab's write). */
export const reloadSeenReports = (): void => {
  seen = null;
};

/** The report ids opened in this browser; every reader re-renders on a change. */
export const useSeenReports = (): string[] => useSyncExternalStore(subscribe, current);
