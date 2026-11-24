import { type RefObject, useEffect, useRef } from 'react';

/** Presses in the composer or in a portalled management dialog do not close it. */
export function useOutsideClose(ref: RefObject<HTMLElement | null>, onClose: () => void): void {
  const latest = useRef(onClose);
  useEffect(() => {
    latest.current = onClose;
  });
  useEffect(() => {
    const away = (e: PointerEvent) => {
      const home = ref.current?.closest('form') ?? ref.current;
      const target = e.target instanceof Element ? e.target : null;
      if (target && home && !home.contains(target) && !target.closest('[role="dialog"], [role="alertdialog"]')) latest.current();
    };
    document.addEventListener('pointerdown', away);
    return () => document.removeEventListener('pointerdown', away);
  }, [ref]);
}
