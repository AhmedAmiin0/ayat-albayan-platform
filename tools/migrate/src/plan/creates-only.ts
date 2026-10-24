// --creates-only: write new records only; every planned update becomes a skip (the app wins).
import type { PlanWithChanges } from './changes.ts';
import { countPlan } from './diff.ts';

/**
 * Owner 2026-10-24 («get all the contacts … and save them»): a delta sync while the old CRM and
 * sheets keep running adds what is new and never rewrites a record the team may have edited in
 * the app (a lead's status, a template's Meta id). A skipped update keeps its target id, so refs
 * from new rows still resolve, and records no import item, so a later full apply still offers it.
 */
export function createsOnly(plan: PlanWithChanges): PlanWithChanges {
  const items = plan.items.map((i) =>
    i.action === 'update' ? { ...i, action: 'skip' as const } : i,
  );
  return { ...plan, items, counts: countPlan({ items, issues: plan.issues }), changes: [] };
}
