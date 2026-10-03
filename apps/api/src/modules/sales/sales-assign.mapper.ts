import type { SalesCandidate } from '@ab/shared';

export interface AssignedLead {
  assigned_to: string | null;
  status: string;
  updated_at: string;
}

/** A converted or lost lead is no longer work in progress. */
const CLOSED: ReadonlySet<string> = new Set(['converted', 'lost']);

/**
 * Salespeople as pickSales wants them. lastAssignedAt = the newest updated_at over everything
 * assigned to them (nothing is added to the DB for it, so any later touch of a lead also moves it).
 */
export function toCandidates(ids: readonly string[], leads: readonly AssignedLead[]): SalesCandidate[] {
  return ids.map((id) => {
    const mine = leads.filter((l) => l.assigned_to === id);
    const stamps = mine.map((l) => Date.parse(l.updated_at));
    return {
      id,
      openLeads: mine.filter((l) => !CLOSED.has(l.status)).length,
      lastAssignedAt: stamps.length ? new Date(Math.max(...stamps)).toISOString() : null,
    };
  });
}
