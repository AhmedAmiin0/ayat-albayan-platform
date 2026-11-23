import { scrollBehavior } from '#/lib/motion/index.ts';

// A tapped quote's original: scrolled into view and flashed (its edge rings for 1.5 s), as the
// phone's chat does. An original older than the loaded pages is not on the page: nothing moves.
// The row is looked up inside the quote's own thread, so two mounted copies of a chat (the
// child page and the room's panel) never reach into each other.

const FLASH_MS = 1500;

/** Marks a thread's list: where a quote looks for its original. */
export const threadAttrs = { 'data-channel-thread': '' } as const;

/** A message's row in the thread: `data-channel-msg={id}`. */
export const rowAttrs = (messageId: string) => ({ 'data-channel-msg': messageId });

/** The row of `messageId` in the thread around `from`, or null (not loaded, or no thread). */
export function rowIn(from: Element, messageId: string): HTMLElement | null {
  const thread = from.closest('[data-channel-thread]');
  const rows = thread?.querySelectorAll<HTMLElement>('[data-channel-msg]') ?? [];
  return Array.from(rows).find((row) => row.dataset.channelMsg === messageId) ?? null;
}

/** Scrolls to the message's row and flashes it (data-flash) for 1.5 s; not loaded → nothing. */
export function jumpToMessage(from: Element, messageId: string): void {
  const row = rowIn(from, messageId);
  if (!row) return;
  // jsdom (the unit tests) has no scrollIntoView.
  if (typeof row.scrollIntoView === 'function') {
    row.scrollIntoView({ block: 'center', behavior: scrollBehavior() });
  }
  row.dataset.flash = '';
  window.setTimeout(() => delete row.dataset.flash, FLASH_MS);
}
