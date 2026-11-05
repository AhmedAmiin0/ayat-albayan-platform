import { bubbleId } from '@/features/messaging/inbox/messages/lib/jump-to-message';

/** The header's «بحث» button: focus returns to it when the bar closes. */
export const SEARCH_TOGGLE_ID = 'chat-search-toggle';
/** The bar the button opens (its aria-controls). */
export const SEARCH_BAR_ID = 'chat-search-bar';

/** Closing the search: back to the newest message (the log pins itself there again). */
export function toNewest(id: string | undefined): void {
  const el = id ? document.getElementById(bubbleId(id)) : null;
  el?.scrollIntoView({ block: 'end' });
  document.getElementById(SEARCH_TOGGLE_ID)?.focus();
}
