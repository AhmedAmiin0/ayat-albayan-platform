import type { RouteResult } from '@ab/core';
import type { salesAssignRoutes } from '@ab/shared';

type Answer<K extends keyof typeof salesAssignRoutes> = Promise<
  RouteResult<(typeof salesAssignRoutes)[K]>
>;

export interface LeadAssignment {
  leadId: string;
  /** null takes the lead back from its salesperson. */
  profileId: string | null;
}

export interface SalesAssignCalls {
  people: () => Answer<'people'>;
  assignUnassigned: () => Answer<'assignUnassigned'>;
  assign: (input: LeadAssignment) => Answer<'assign'>;
}
