import { type RefObject, useEffect, useRef } from 'react';

/**
 * Closes the quick-replies list on a press outside its composer (the chat, the thread list), as
 * WhatsApp. A press in the composer itself (the box, the replies button) leaves it to them, and so
 * does one in a dialog «إدارة» opened (they are portalled out of the form).
 */
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
