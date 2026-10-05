/** A salesperson as the auto-assignment sees them. */
export interface SalesCandidate {
  id: string;
  /** Leads currently assigned to them that are still being worked (not converted, not lost). */
  openLeads: number;
  /** When they were last handed a lead (ISO), null if never. */
  lastAssignedAt: string | null;
}

/**
 * Who gets the next new lead: the least loaded salesperson; a tie goes to whoever was handed a lead
 * longest ago (never-assigned first), then to the lowest id so the answer is stable. No candidates =
 * null: the lead stays unassigned and the admin assigns it.
 */
export function pickSales(candidates: readonly SalesCandidate[]): string | null {
  const stamp = (c: SalesCandidate) => (c.lastAssignedAt === null ? Number.NEGATIVE_INFINITY : Date.parse(c.lastAssignedAt));
  const sorted = [...candidates].sort(
    (a, b) => a.openLeads - b.openLeads || stamp(a) - stamp(b) || a.id.localeCompare(b.id),
  );
  return sorted[0]?.id ?? null;
}
