import { useEffect, useRef, type RefObject } from 'react';

/**
 * Focuses `ref` (give it tabIndex={-1} and an accessible name) whenever `key` changes, not on the
 * first render: when a step or form replaces the control that had focus, focus would otherwise
 * fall to <body> and a screen reader would not hear that the content changed.
 */
export function useFocusOnChange(ref: RefObject<HTMLElement | null>, key: unknown): void {
  const first = useRef(true);
  useEffect(() => {
    if (first.current) {
      first.current = false;
      return;
    }
    ref.current?.focus({ preventScroll: false });
  }, [ref, key]);
}
