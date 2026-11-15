/** What Android's back needs to decide on a tab's stack (useTabListBack). */
export interface TabBackState {
  /** The focused path, e.g. '/sales/students/12'. */
  pathname: string;
  /** The tab's route name (its folder), e.g. 'students'. */
  tab: string;
  /** This tab is the focused one. */
  focused: boolean;
  /** The focused stack holds a screen beneath (router.canDismiss). */
  canDismiss: boolean;
}

/** The tab's own list in a path: '/sales/students/12' in tab 'students' → '/sales/students'. */
export function tabListOf(pathname: string, tab: string): string | null {
  const parts = pathname.split('/');
  const at = parts.indexOf(tab, 1);
  return at < 0 ? null : parts.slice(0, at + 1).join('/');
}

const isLoneDetail = (s: TabBackState, list: string | null): list is string =>
  s.focused && !s.canDismiss && list !== null && list !== s.pathname;

/**
 * The list to replace a lone detail screen with on Android's back, or null to leave back to the
 * navigators (a screen beneath: pop; the tab's own list: the tabs' back, to Today, as before).
 */
export function tabListBack(s: TabBackState): string | null {
  const list = tabListOf(s.pathname, s.tab);
  return isLoneDetail(s, list) ? list : null;
}
