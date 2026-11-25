import type { FamilyTab } from '@ab/client-core';
import type { IconName } from '@ab/web-kit';

/** Each tab's page and icon in the family app's bar. */
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

/** None for the alerts page, where the bell lights instead. */
export function tabOf(pathname: string): FamilyTab | null {
  return SECTION.find(([prefix]) => pathname.startsWith(prefix))?.[1] ?? null;
}
