// A tapped quote's original: scrolled into view and flashed (its edge rings for 1.5 s), as the
// phone's chat does. An original older than the loaded pages is not on the page: nothing moves.

const FLASH_MS = 1500;

/** The element id of a message's row in the thread. */
export const messageDomId = (messageId: string): string => `channel-msg-${messageId}`;

/** The reader asked for less motion (jsdom has no matchMedia: as if not). */
const reduced = (): boolean =>
  typeof window.matchMedia === 'function' &&
  window.matchMedia('(prefers-reduced-motion: reduce)').matches;

/** Scrolls to the message's row and flashes it (data-flash) for 1.5 s; not loaded → nothing. */
export function jumpToMessage(messageId: string): void {
  const row = document.getElementById(messageDomId(messageId));
  if (!row) return;
  // jsdom (the unit tests) has no scrollIntoView.
  if (typeof row.scrollIntoView === 'function') {
    row.scrollIntoView({ block: 'center', behavior: reduced() ? 'auto' : 'smooth' });
  }
  row.dataset.flash = '';
  window.setTimeout(() => delete row.dataset.flash, FLASH_MS);
}
