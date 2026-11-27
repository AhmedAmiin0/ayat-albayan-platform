import type { FamilyTab } from '@ab/client-core';
import type { TabIconName } from '@ab/mobile-kit';

/** Each tab's route under app/(tabs) and its icon. */
export const ROUTE: Record<FamilyTab, string> = {
  home: 'index',
  schedule: 'schedule',
  reports: 'reports',
  account: 'account',
};
export const ICON: Record<FamilyTab, TabIconName> = {
  home: 'home',
  schedule: 'schedule',
  reports: 'reports',
  account: 'account',
};
