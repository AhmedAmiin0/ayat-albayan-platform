// A quote's «انتقل إلى الرسالة الأصلية»: the original bubble scrolled into the log's view, focused
// and highlighted briefly (data-flash). No smooth scroll under prefers-reduced-motion.

/** How long the original stays highlighted. */
export const FLASH_MS = 1500;

/** The bubble's DOM id (MessageBubble's <li>): message ids are unique, one chat on the page. */
export const bubbleId = (id: string): string => `msg-${id}`;

const reducedMotion = (): boolean =>
  typeof matchMedia === 'function' && matchMedia('(prefers-reduced-motion: reduce)').matches;

/** false when the original is not in the log (older than the loaded pages). */
export function jumpToMessage(id: string): boolean {
  const el = document.getElementById(bubbleId(id));
  if (!el) return false;
  el.scrollIntoView({ block: 'center', behavior: reducedMotion() ? 'auto' : 'smooth' });
  el.focus({ preventScroll: true });
  el.setAttribute('data-flash', '');
  setTimeout(() => el.removeAttribute('data-flash'), FLASH_MS);
  return true;
}
