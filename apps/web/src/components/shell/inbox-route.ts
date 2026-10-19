import { cn } from '@/lib/utils';

// The chat inbox routes (/admin/inbox, /sales/inbox, /teacher/inbox): on phones (< 640px) their
// frame is tighter (owner, 2026-10-05).

/** True on an inbox route (the list or an open thread: the thread is a search param). */
export function isInboxPath(pathname: string | undefined): boolean {
  return !!pathname && /^\/(admin|sales|teacher)\/inbox\/?$/.test(pathname);
}

/** The work page's phone padding on the inbox: the chat gets nearly the whole screen (no toast room). */
export const INBOX_PAGE = 'max-sm:px-2 max-sm:pt-2 max-sm:pb-1 max-sm:[&>div]:pb-0';

/**
 * The top-bar layouts' inbox page (sales, teacher; the admin shell keeps INBOX_PAGE): from 900px no
 * outer margin and a 12px inset, so the chat gets the frame's height and width.
 */
export const INBOX_PAGE_TOPBAR = cn(INBOX_PAGE, 'shell:m-0 shell:px-3 shell:pt-3 shell:pb-3');
