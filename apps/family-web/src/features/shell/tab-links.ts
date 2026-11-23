import type { FamilyTab } from '@ab/client-core';
import type { IconName } from '@ab/web-kit/ui';

/** Each tab's page and icon (owner 2026-11-15, the family app's bar). */
export const TAB_PATH: Readonly<Record<FamilyTab, string>> = {
  home: '/portal',
  schedule: '/schedule',
  reports: '/reports',
  account: '/account',
};

export const TAB_ICON: Readonly<Record<FamilyTab, IconName>> = {
  home: 'grid',
  schedule: 'calendar',
  reports: 'template',
  account: 'person',
};

/** The pages each tab lights for (its own, a child's page under home, one report under reports). */
const SECTION: readonly (readonly [string, FamilyTab])[] = [
  ['/portal', 'home'],
  ['/children', 'home'],
  ['/schedule', 'schedule'],
  ['/reports', 'reports'],
  ['/report/', 'reports'],
  ['/account', 'account'],
];

/** The tab the page at `pathname` belongs to; none for «الإشعارات» (the bell lights then). */
export function tabOf(pathname: string): FamilyTab | null {
  return SECTION.find(([prefix]) => pathname.startsWith(prefix))?.[1] ?? null;
}
