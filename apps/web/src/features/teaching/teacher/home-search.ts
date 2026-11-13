import { useState } from 'react';
import { z } from 'zod';

// /teacher?tab= (docs/48): the open home tab survives a refresh and the way back from a report.
// The web-schedule PR drops week and availability.

export const HOME_TABS = ['students', 'today', 'week', 'availability'] as const;
export type DashboardTab = (typeof HOME_TABS)[number];

/** Optional, so a plain link opens «طلابي» (docs/46 C1); junk reads as none, not an error. */
const homeSearch = z.object({ tab: z.enum(HOME_TABS).optional().catch(undefined) });
export type TeacherHomeSearch = z.infer<typeof homeSearch>;

export const parseTeacherHomeSearch = (search: Record<string, unknown>): TeacherHomeSearch =>
  homeSearch.parse(search);

/** The open tab in ?tab= (the route); without it (a test) the dashboard keeps its own. */
export interface HomeTabProps {
  tab: DashboardTab;
  onTab: (tab: DashboardTab) => void;
}

/** The route's tab when given, else local state starting at «طلابي». */
export function useHomeTab(given: Partial<HomeTabProps>): HomeTabProps {
  const [own, setOwn] = useState<DashboardTab>('students');
  return { tab: given.tab ?? own, onTab: given.onTab ?? setOwn };
}
