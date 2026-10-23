// The search params of the module pages under /admin/settings (docs/26b §3): the tab in view on
// «التواصل» (`?tab=`), and Google's OAuth return (`?google=connected` / `?google=error&reason=…`).

/** «التواصل»'s tabs in order; «الإرسال» is the default (no `?tab=`). */
export const COMMUNICATIONS_TABS = ['sending', 'numbers', 'catalogue', 'templates'] as const;
export type CommunicationsTab = (typeof COMMUNICATIONS_TABS)[number];

export interface CommunicationsSearch {
  tab?: CommunicationsTab;
}

const isTab = (value: unknown): value is CommunicationsTab =>
  typeof value === 'string' && (COMMUNICATIONS_TABS as readonly string[]).includes(value);

/** Keeps a known tab only (an unknown one falls back to «الإرسال»). */
export function parseCommunicationsSearch(search: Record<string, unknown>): CommunicationsSearch {
  return isTab(search.tab) && search.tab !== 'sending' ? { tab: search.tab } : {};
}

/** The URL's search for a tab: the default tab leaves it empty. */
export const communicationsSearch = (tab: CommunicationsTab): CommunicationsSearch => (tab === 'sending' ? {} : { tab });

/** Google's OAuth return, as the API puts it on the URL. */
export interface OauthReturnSearch {
  google?: string;
  reason?: string;
}

/** Keeps the OAuth return's two params (strings only); the page reads and then clears them. */
export function parseOauthReturnSearch(search: Record<string, unknown>): OauthReturnSearch {
  const out: OauthReturnSearch = {};
  if (typeof search.google === 'string' && search.google !== '') out.google = search.google;
  if (typeof search.reason === 'string' && search.reason !== '') out.reason = search.reason;
  return out;
}

/**
 * Back from Google's consent screen on «التكاملات» (the hub forwards /admin/settings?google=…
 * there): the note belongs to «مزامنة Google», so go there at once with the same query (replace,
 * so «رجوع» does not come back through it). Null when the URL is not an OAuth return.
 */
export function oauthReturnRedirect(search: OauthReturnSearch) {
  if (!search.google) return null;
  return { to: '/admin/settings/google' as const, search: { ...search }, replace: true };
}
