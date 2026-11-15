import { familyTabs, type FamilyTab } from '@ab/client-core';
import type { PortalKind } from '@ab/shared';
import type { IconName } from '@ab/web-kit/components/ui/display/icon';

/** Each tab's page and icon (owner 2026-11-15, the family app's bar). */
export const TAB_PATH: Readonly<Record<FamilyTab, string>> = {
  home: '/portal',
  schedule: '/schedule',
  children: '/children',
  reports: '/reports',
  account: '/account',
};

export const TAB_ICON: Readonly<Record<FamilyTab, IconName>> = {
  home: 'grid',
  schedule: 'calendar',
  children: 'users',
  reports: 'template',
  account: 'person',
};

/** Until /portal/me answers: the tabs every login has (no «أبنائي» flash for a student). */
const COMMON: readonly FamilyTab[] = ['home', 'schedule', 'account'];

/** The bar of this login, in order; the common tabs while its kind is unknown. */
export const tabsOf = (kind: PortalKind | undefined): readonly FamilyTab[] =>
  kind ? familyTabs(kind) : COMMON;
