import { useSyncExternalStore } from 'react';

// The child switch (owner 2026-11-16, canvas SwitchSheet, SwitchDone): one sheet for every tab,
// opened from any tab's header, and «تُعرض الآن صفحة …» after a switch, which outlives the page
// it replaces (a new pick remounts home). Module state: one app, one switch.

/** How long the note after a switch stays. */
export const SWITCH_NOTICE_MS = 4000;

export interface ChildSwitchState {
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
