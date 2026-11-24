// docs/26b §3.
import { NOTIFICATION_AUDIENCES, type NotificationAudience } from '@ab/shared';

/** docs/23 §2d; the default tab has no `?tab=`. */
export const COMMUNICATIONS_TABS = ['overview', 'numbers', 'catalogue', 'templates', 'savedReplies', 'safety'] as const;
export type CommunicationsTab = (typeof COMMUNICATIONS_TABS)[number];

/** Removed in docs/23 phase 6; kept only to redirect old links. */
export const MOVED_TIMING_TAB = 'timing';

export interface CommunicationsSearch {
  tab?: CommunicationsTab | typeof MOVED_TIMING_TAB;
  /** Kept only with `tab=catalogue`. */
  audience?: NotificationAudience;
}

export const VALUES_GROUP = { timing: 'messages', academy: 'academy' } as const;

const isTab = (value: unknown): value is CommunicationsTab =>
  typeof value === 'string' && (COMMUNICATIONS_TABS as readonly string[]).includes(value);

const isAudience = (value: unknown): value is NotificationAudience =>
  typeof value === 'string' && (NOTIFICATION_AUDIENCES as readonly string[]).includes(value);

/** `timing` stays so the route can redirect it; unknown values are dropped. */
export function parseCommunicationsSearch(search: Record<string, unknown>): CommunicationsSearch {
  if (search.tab === MOVED_TIMING_TAB) return { tab: MOVED_TIMING_TAB };
  if (!isTab(search.tab) || search.tab === 'overview') return {};
  if (search.tab === 'catalogue' && isAudience(search.audience)) return { tab: search.tab, audience: search.audience };
  return { tab: search.tab };
}

export const shownTab = (search: CommunicationsSearch): CommunicationsTab => (isTab(search.tab) ? search.tab : 'overview');

/** The default tab leaves the search empty. */
export function communicationsSearch(tab: CommunicationsTab, audience?: NotificationAudience): CommunicationsSearch {
  if (tab === 'overview') return {};
  return tab === 'catalogue' && audience ? { tab, audience } : { tab };
}

/** Redirects with replace (docs/26b §6a 1.16, 1.19); null for any other tab. */
export function timingRedirect(search: CommunicationsSearch) {
  if (search.tab !== MOVED_TIMING_TAB) return null;
  return { to: '/admin/settings/values' as const, search: { group: VALUES_GROUP.timing }, replace: true };
}

/** The docs/23 §2d alias keeps the same query and replaces the history entry. */
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

/** Redirects with replace so back does not return through it; null when not an OAuth return. */
export function oauthReturnRedirect(search: OauthReturnSearch) {
  if (!search.google) return null;
  return { to: '/admin/settings/google' as const, search: { ...search }, replace: true };
}
