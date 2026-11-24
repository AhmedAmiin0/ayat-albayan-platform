import { useSyncExternalStore } from 'react';

// The note after a switch outlives the page it replaces; module state: one app, one switch.

/** How long the note after a switch stays. */
export const SWITCH_NOTICE_MS = 4000;

interface ChildSwitchState {
  /** The sheet with the children is up. */
  open: boolean;
  /** The note after a switch, while it shows. */
  notice: string | null;
}

let state: ChildSwitchState = { open: false, notice: null };
let timer: ReturnType<typeof setTimeout> | undefined;
const listeners = new Set<() => void>();

function update(next: Partial<ChildSwitchState>): void {
  state = { ...state, ...next };
  listeners.forEach((listener) => listener());
}

function subscribe(listener: () => void): () => void {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

export const openChildSwitch = (): void => update({ open: true });
export const closeChildSwitch = (): void => update({ open: false });

/** After a switch: the sheet goes and the note shows for SWITCH_NOTICE_MS. */
export function showSwitched(notice: string): void {
  clearTimeout(timer);
  update({ open: false, notice });
  timer = setTimeout(() => update({ notice: null }), SWITCH_NOTICE_MS);
}

/** The sheet and the note; every reader re-renders on a change. */
export const useChildSwitch = (): ChildSwitchState =>
  useSyncExternalStore(subscribe, () => state);
