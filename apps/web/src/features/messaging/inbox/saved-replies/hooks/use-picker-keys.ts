import { useState, type KeyboardEvent } from 'react';

export interface PickerKeys {
  /** The highlighted row (aria-activedescendant), clamped to the list. */
  active: number;
  setActive: (index: number) => void;
  /** ↑ ↓ move, Enter picks (and is taken even on an empty list), Esc closes; true when the key was the picker's (the caller stops it). */
  onKey: (e: KeyboardEvent<HTMLElement>) => boolean;
}

interface Picker {
  count: number;
  active: number;
  setActive: (index: number) => void;
  onPick: (index: number) => void;
  onClose: () => void;
}

/** The highlight moved `by` rows, wrapping; 0 on an empty list. */
const step = (p: Picker, by: number): void =>
  p.setActive(p.count ? (p.active + by + p.count) % p.count : 0);

type PickerKey = 'Escape' | 'ArrowDown' | 'ArrowUp' | 'Enter';

const KEYS = {
  Escape: (p: Picker) => p.onClose(),
  ArrowDown: (p: Picker) => step(p, 1),
  ArrowUp: (p: Picker) => step(p, -1),
  // Always taken, even with nothing to pick (no match, still loading): the «/…» text never sends.
  Enter: (p: Picker) => (p.count ? p.onPick(p.active) : undefined),
} satisfies Record<PickerKey, (p: Picker) => void>;

/** A key the picker takes: one of KEYS, but Shift+Enter stays the composer's new line. */
const isPickerKey = (e: KeyboardEvent<HTMLElement>, key: string): key is PickerKey =>
  Object.hasOwn(KEYS, key) && !(key === 'Enter' && e.shiftKey);

/** The picker's keyboard, shared by its search box and the composer while «/» has it open. */
export function usePickerKeys(input: { count: number; onPick: (index: number) => void; onClose: () => void }): PickerKeys {
  const [raw, setActive] = useState(0);
  const active = input.count ? Math.min(raw, input.count - 1) : 0;
  const onKey = (e: KeyboardEvent<HTMLElement>): boolean => {
    const { key } = e;
    if (!isPickerKey(e, key)) return false;
    KEYS[key]({ ...input, active, setActive });
    e.preventDefault();
    return true;
  };
  return { active, setActive, onKey };
}
