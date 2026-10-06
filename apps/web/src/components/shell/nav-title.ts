/** A nav link as the shell needs it for the top bar's title: where it goes and what it is called. */
export interface NavTitleItem {
  to: string;
  label: string;
}

/**
 * The phone/tablet top bar's page title (owner, 2026-10-05: one compact bar): the label of the nav
 * item whose path is the longest prefix of `pathname`; the section home (`home`) otherwise.
 */
export function titleFor(pathname: string | undefined, items: readonly NavTitleItem[], home: string): string {
  if (!pathname) return home;
  let best: NavTitleItem | undefined;
  for (const item of items) {
    const hit = pathname === item.to || pathname.startsWith(`${item.to}/`);
    if (hit && (!best || item.to.length > best.to.length)) best = item;
  }
  return best?.label ?? home;
}
