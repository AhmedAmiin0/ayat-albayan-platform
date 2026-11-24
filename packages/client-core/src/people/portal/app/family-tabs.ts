import type { FamilyPick } from './family-pick.js';

// docs/50 §6: one student at a time; the reports tab hides until a student is picked.

export const FAMILY_TABS = ['home', 'schedule', 'reports', 'account'] as const;
export type FamilyTab = (typeof FAMILY_TABS)[number];

const NO_STUDENT: readonly FamilyTab[] = ['home', 'schedule', 'account'];

const TABS_OF: Readonly<Record<FamilyPick['state'], readonly FamilyTab[]>> = {
  one: FAMILY_TABS,
  loading: NO_STUDENT,
  choose: NO_STUDENT,
  empty: NO_STUDENT,
};

/** The tab bar for the student in view, in order (the first sits at the inline-start). */
export const familyTabs = (pick: FamilyPick): readonly FamilyTab[] => TABS_OF[pick.state];

/** Whether the bar has `tab` (a hidden tab is a protected route: unreachable). */
export const hasFamilyTab = (pick: FamilyPick, tab: FamilyTab): boolean =>
  familyTabs(pick).includes(tab);
