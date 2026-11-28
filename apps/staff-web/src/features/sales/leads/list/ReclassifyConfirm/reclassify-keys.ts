import type { KeyboardEvent } from 'react';

/** A stable ref callback, so focus lands on the safe choice once, when it mounts. */
export const focusOnMount = (el: HTMLElement | null): void => {
  el?.focus();
};

/** Esc keeps the lead without reaching the row behind. */
export const escapeKeeps =
  (onKeep: () => void) =>
  (e: Pick<KeyboardEvent, 'key' | 'stopPropagation'>): void => {
    if (e.key !== 'Escape') return;
    e.stopPropagation();
    onKeep();
  };
