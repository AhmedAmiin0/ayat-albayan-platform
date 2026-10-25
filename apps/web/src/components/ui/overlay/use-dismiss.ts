import { useEffect, useRef, type RefObject } from 'react';

export interface DismissOptions {
  /** Listen only while the popover is open. */
  open: boolean;
  /** Called on a pointerdown outside `ref` or on Esc (`how` tells which: Esc may return focus). */
  onDismiss: (how: 'outside' | 'escape') => void;
}

/**
 * Closing logic of the small popovers («⋯ المزيد», the bell): a pointerdown outside the box or
 * Esc anywhere. Non-modal: no focus trap, the rest of the page stays usable. The latest
 * `onDismiss` is called, so callers need not memoise it.
 */
export function useDismiss(ref: RefObject<HTMLElement | null>, { open, onDismiss }: DismissOptions): void {
  const latest = useRef(onDismiss);
  useEffect(() => {
    latest.current = onDismiss;
  });
  useEffect(() => {
    if (!open) return;
    const away = (e: PointerEvent) => {
      if (e.target instanceof Node && !ref.current?.contains(e.target)) latest.current('outside');
    };
    const esc = (e: KeyboardEvent) => {
      if (e.key === 'Escape') latest.current('escape');
    };
    document.addEventListener('pointerdown', away);
    document.addEventListener('keydown', esc);
    return () => {
      document.removeEventListener('pointerdown', away);
      document.removeEventListener('keydown', esc);
    };
  }, [open, ref]);
}
