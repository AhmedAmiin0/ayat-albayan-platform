import type { PortalKind } from '@ab/shared';

// The family app's bottom tabs per login (owner 2026-11-15, docs/50 §6): a guardian follows their
// children («أبنائي»), a student their own reports. A student never gets «أبنائي» (nor money:
// seesMoney). Reports of a guardian's child live inside the child («حضرها» → the report).

export const FAMILY_TABS = ['home', 'schedule', 'children', 'reports', 'account'] as const;
export type FamilyTab = (typeof FAMILY_TABS)[number];

const TABS_OF: Readonly<Record<PortalKind, readonly FamilyTab[]>> = {
  guardian: ['home', 'schedule', 'children', 'account'],
  student: ['home', 'schedule', 'reports', 'account'],
};

/** The tab bar of this login, in order (the first sits at the inline-start). */
export const familyTabs = (kind: PortalKind): readonly FamilyTab[] => TABS_OF[kind];

/** Whether this login's bar has `tab` (a hidden tab is a protected route: unreachable). */
export const hasFamilyTab = (kind: PortalKind, tab: FamilyTab): boolean =>
  TABS_OF[kind].includes(tab);
