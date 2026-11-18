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
