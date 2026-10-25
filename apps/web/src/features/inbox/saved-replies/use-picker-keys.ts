import { useState, type KeyboardEvent } from 'react';

export interface PickerKeys {
  /** The highlighted row (aria-activedescendant), clamped to the list. */
  active: number;
  setActive: (index: number) => void;
  /** ↑ ↓ move, Enter picks, Esc closes; true when the key was the picker's (the caller stops it). */
  onKey: (e: KeyboardEvent<HTMLElement>) => boolean;
}

/** The picker's keyboard, shared by its search box and the composer while «/» has it open. */
export function usePickerKeys(input: { count: number; onPick: (index: number) => void; onClose: () => void }): PickerKeys {
  const [raw, setActive] = useState(0);
  const active = input.count ? Math.min(raw, input.count - 1) : 0;
  const onKey = (e: KeyboardEvent<HTMLElement>): boolean => {
    if (e.key === 'Escape') input.onClose();
    else if (e.key === 'ArrowDown') setActive(input.count ? (active + 1) % input.count : 0);
    else if (e.key === 'ArrowUp') setActive(input.count ? (active - 1 + input.count) % input.count : 0);
    else if (e.key === 'Enter' && !e.shiftKey && input.count) input.onPick(active);
    else return false;
    e.preventDefault();
    return true;
  };
  return { active, setActive, onKey };
}
