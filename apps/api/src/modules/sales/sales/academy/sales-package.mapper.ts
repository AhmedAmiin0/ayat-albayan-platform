import { currentPackage, type SalesPackageSummary } from '@ab/shared';
import type { RosterBalanceRow, RosterPackageRow, SalesRosterRepo } from './sales-roster.repo';

/** Each student's current package (the newest active one, else the newest not cancelled). */
export function currentPackages(
  newestFirst: readonly RosterPackageRow[],
): Map<string, RosterPackageRow> {
  const byStudent = new Map<string, RosterPackageRow[]>();
  for (const row of newestFirst) {
    byStudent.set(row.student_id, [...(byStudent.get(row.student_id) ?? []), row]);
  }
  const out = new Map<string, RosterPackageRow>();
  for (const [id, rows] of byStudent) {
    const current = currentPackage(rows);
    if (current) out.set(id, current);
  }
  return out;
}

/**
 * Whitelist of the summary (owner 2026-10-30): size, status, dates, lessons used / left. Every
 * field named: nothing else of a row leaves (no price, currency, payment or commission).
 */
export function toPackageSummary(
  row: RosterPackageRow,
  b?: RosterBalanceRow,
): SalesPackageSummary {
  const used = b?.lessons_used ?? 0;
  return {
    id: row.id,
    package: row.package,
    status: row.status,
    starts_on: row.starts_on,
    renews_on: row.renews_on,
    ended_at: b?.ended_at ?? null,
    projected_end_at: b?.projected_end_at ?? null,
    created_at: row.created_at,
    lessons_total: row.lessons_total,
    lessons_used: used,
    lessons_remaining: b?.remaining ?? Math.max(row.lessons_total - used, 0),
  };
}

/** The current package of each student of `rows`, with its balance: one more read (balances). */
export async function packageSummaries(
  repo: Pick<SalesRosterRepo, 'balances'>,
  rows: readonly RosterPackageRow[],
): Promise<Map<string, SalesPackageSummary>> {
  const current = currentPackages(rows);
  const balances = await repo.balances([...current.values()].map((p) => p.id));
  const summary = (row: RosterPackageRow) =>
    toPackageSummary(row, balances.find((b) => b.subscription_id === row.id));
  return new Map([...current].map(([id, row]) => [id, summary(row)]));
}
