// The chat inbox routes (/admin/inbox, /sales/inbox, /teacher/inbox): on phones (< 640px) their
// frame is tighter and the theme switch under the page is left out (owner, 2026-10-05).

/** True on an inbox route (the list or an open thread: the thread is a search param). */
export function isInboxPath(pathname: string | undefined): boolean {
  return !!pathname && /^\/(admin|sales|teacher)\/inbox\/?$/.test(pathname);
}

/** The work page's phone padding on the inbox: the list keeps the card, with less room around it. */
export const INBOX_PAGE = 'max-sm:m-0.5 max-sm:px-2.5 max-sm:pt-3 max-sm:pb-2';
