// «لم تُحجز أيام الحلقات» (owner 2026-11-06): pure rules of paid packages with no weekly course.

/** How long a package stays active without its course before the staff are told. */
export const COURSE_DUE_AFTER_MS = 2 * 3_600_000;
/** How far back an activation is looked at (older ones were imported or long handled). */
export const COURSE_DUE_LOOKBACK_MS = 7 * 24 * 3_600_000;

/** One activation (audit_log status_change → active) of a package. */
export interface Activation {
  entity_id: string;
  at: string;
}

/** The packages whose LATEST activation is at least COURSE_DUE_AFTER_MS old. */
export function dueActivations(rows: readonly Activation[], now: Date): string[] {
  const latest = new Map<string, string>();
  for (const r of rows) latest.set(r.entity_id, maxIso(latest.get(r.entity_id), r.at));
  const cutoff = now.getTime() - COURSE_DUE_AFTER_MS;
  return [...latest].filter(([, at]) => Date.parse(at) <= cutoff).map(([id]) => id);
}

const maxIso = (a: string | undefined, b: string): string => (a !== undefined && a > b ? a : b);

/** An active rule of the student not tied to a package (an imported course). */
export interface LegacyRule {
  student_id: string;
  starts_on: string;
  ends_on: string | null;
  package: string | null;
}

/** A weekly course still running from `today` (not a trial, not a one-day makeup). */
const runs = (r: LegacyRule, today: string): boolean =>
  r.package !== 'trial' && r.starts_on !== r.ends_on && (r.ends_on === null || r.ends_on >= today);

/**
 * The students with an imported weekly course still running: their days live on that course (the
 * assistant cannot book over it), so their new package raises no alert.
 */
export function legacyStudents(rules: readonly LegacyRule[], today: string): Set<string> {
  return new Set(rules.filter((r) => runs(r, today)).map((r) => r.student_id));
}
