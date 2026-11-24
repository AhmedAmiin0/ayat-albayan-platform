import { z } from 'zod';
import type { SeenStorage } from './seen-store.js';

// Keyed by the picking profile so another account on the same phone never inherits it.

/** The device key the family app keeps the pick under. */
export const PICKED_CHILD_KEY = 'ab.portal.picked-child';

export interface SavedPick {
  profileId: string;
  studentId: string;
}

export interface PickStoreState {
  /** The saved pick is read (or could not be). */
  ready: boolean;
  saved: SavedPick | null;
}

export interface PickStore {
  subscribe: (listener: () => void) => () => void;
  /** The same object until something changes (useSyncExternalStore). */
  current: () => PickStoreState;
  pick: (choice: SavedPick) => void;
}

const savedSchema = z
  .object({ profileId: z.string(), studentId: z.string() })
  .nullable()
  .catch(null);

const decodeJson: (text: string) => unknown = JSON.parse;

/** The stored text → the pick; anything unreadable is no pick. */
function parsePick(raw: string | null): SavedPick | null {
  try {
    return savedSchema.parse(decodeJson(raw ?? 'null'));
  } catch {
    return null;
  }
}

/** This login's saved student id (another profile's pick is none) and whether it is known. */
export function savedFor(
  state: PickStoreState,
  profileId: string,
): { savedId: string | null; ready: boolean } {
  const saved = state.saved?.profileId === profileId ? state.saved : null;
  return { savedId: saved ? saved.studentId : null, ready: state.ready && profileId !== '' };
}

export function pickStore(storage: SeenStorage): PickStore {
  let state: PickStoreState = { ready: false, saved: null };
  let reading: Promise<void> | null = null;
  const listeners = new Set<() => void>();
  const update = (next: Partial<PickStoreState>): void => {
    state = { ...state, ...next };
    for (const listener of listeners) listener();
  };
  // A pick made while the read was out wins over the saved one.
  const loaded = (raw: string | null): void =>
    update({ ready: true, saved: state.saved ?? parsePick(raw) });
  const read = (): Promise<void> => {
    reading ??= storage.getItem(PICKED_CHILD_KEY).then(loaded, () => update({ ready: true }));
    return reading;
  };
  const pick = (choice: SavedPick): void => {
    update({ saved: choice });
    const save = () => storage.setItem(PICKED_CHILD_KEY, JSON.stringify(choice));
    // A failed write keeps this run's pick only.
    void read().then(save).catch(() => undefined);
  };
  const subscribe = (listener: () => void): (() => void) => {
    void read();
    listeners.add(listener);
    return () => {
      listeners.delete(listener);
    };
  };
  return { subscribe, current: () => state, pick };
}
