// The search params of the module pages under /admin/settings (docs/26b §3): the tab in view on
// «التواصل» (`?tab=`), and Google's OAuth return (`?google=connected` / `?google=error&reason=…`).

/** «التواصل»'s tabs in order (docs/23 §2d); «نظرة عامة» is the default (no `?tab=`). */
export const COMMUNICATIONS_TABS = ['overview', 'numbers', 'catalogue', 'templates', 'safety'] as const;
export type CommunicationsTab = (typeof COMMUNICATIONS_TABS)[number];

/** `?tab=timing` («مواعيد الرسائل», gone in docs/23 phase 6): kept only to send old links on to «القيم». */
export const MOVED_TIMING_TAB = 'timing';

export interface CommunicationsSearch {
  tab?: CommunicationsTab | typeof MOVED_TIMING_TAB;
}

/** The «القيم» groups that hold what «التواصل» shows read-only or no longer edits (VALUE_GROUPS ids). */
export const VALUES_GROUP = { timing: 'messages', academy: 'academy' } as const;

const isTab = (value: unknown): value is CommunicationsTab =>
  typeof value === 'string' && (COMMUNICATIONS_TABS as readonly string[]).includes(value);

/**
 * Keeps a known tab only: the default, the old «الإرسال» (`sending`, its switches are on «نظرة عامة»)
 * and an unknown one leave no param; `timing` stays so the route can send it on to «القيم».
 */
export function parseCommunicationsSearch(search: Record<string, unknown>): CommunicationsSearch {
  if (search.tab === MOVED_TIMING_TAB) return { tab: MOVED_TIMING_TAB };
  return isTab(search.tab) && search.tab !== 'overview' ? { tab: search.tab } : {};
}

/** The tab in view for a parsed search («نظرة عامة» when none). */
export const shownTab = (search: CommunicationsSearch): CommunicationsTab => (isTab(search.tab) ? search.tab : 'overview');

/** The URL's search for a tab: the default tab leaves it empty. */
export const communicationsSearch = (tab: CommunicationsTab): CommunicationsSearch => (tab === 'overview' ? {} : { tab });

/**
 * `?tab=timing`: the two timing values live in «القيم» › «الرسائل» now (docs/26b §6a 1.16, 1.19), so
 * go there at once (replace). Null for any other tab.
 */
export function timingRedirect(search: CommunicationsSearch) {
  if (search.tab !== MOVED_TIMING_TAB) return null;
  return { to: '/admin/settings/values' as const, search: { group: VALUES_GROUP.timing }, replace: true };
}

/** /admin/communications (docs/23 §2d's address) opens «التواصل» with the same query (`?tab=` …), replacing the entry. */
export function communicationsAliasRedirect(search: Record<string, unknown>) {
  return { to: '/admin/settings/communications' as const, search: { ...search }, replace: true };
}

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
