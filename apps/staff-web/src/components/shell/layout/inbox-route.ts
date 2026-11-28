import { cn } from '@ab/web-kit';

// The chat inbox routes (/admin/inbox, /sales/inbox, /teacher/inbox): on phones (< 640px) their
// frame is tighter.

/** True on an inbox route (the list or an open thread: the thread is a search param). */
export function isInboxPath(pathname: string | undefined): boolean {
  return !!pathname && /^\/(admin|sales|teacher)\/inbox\/?$/.test(pathname);
}

/** Work-page phone padding on the inbox: the chat gets nearly the whole screen (no toast room). */
export const INBOX_PAGE = 'max-sm:px-2 max-sm:pt-2 max-sm:pb-1 max-sm:[&>div]:pb-0';

/** From 900px no outer margin and a 12px inset, so the page gets the frame's height and width. */
const TOPBAR_INSET = 'shell:m-0 shell:px-3 shell:pt-3 shell:pb-3';

/** The top-bar layouts' inbox page (sales, teacher; the admin shell keeps INBOX_PAGE). */
export const INBOX_PAGE_TOPBAR = cn(INBOX_PAGE, TOPBAR_INSET);

/**
 * Every other page of a wide shell (the assistant's: the chat's dimensions on every page): the
 * inbox's frame, but the phones keep the room under the last control for a toast.
 */
export const WIDE_PAGE_TOPBAR = cn('max-sm:px-2 max-sm:pt-2', TOPBAR_INSET);
