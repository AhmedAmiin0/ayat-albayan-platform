import type { FamilyTab } from '@ab/client-core';
import type { IconName } from '@ab/web-kit/components/ui/display/icon';

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

/** A tab's pages outside its own path: a report opened from «التقارير» keeps that pill lit. */
const ALSO_UNDER: Readonly<Record<FamilyTab, readonly string[]>> = {
  home: [],
  schedule: [],
  reports: ['/report/'],
  account: [],
};

/** True on one of the tab's pages outside its path (boards PortalWebReport: «التقارير» lit). */
export const litFrom = (tab: FamilyTab, pathname: string): boolean =>
  ALSO_UNDER[tab].some((prefix) => pathname.startsWith(prefix));
