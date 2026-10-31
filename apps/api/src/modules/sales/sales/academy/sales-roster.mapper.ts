import {
  attendanceKind,
  RIYADH_TZ,
  ROSTER_RECENT_DAYS,
  rosterAttendance,
  zonedInstant,
  type RosterAttendance,
  type RosterSlot,
  type SalesPackageSummary,
} from '@ab/shared';
import { toWeeklySlot } from '@/modules/sales/sales/schedule/weekly-slot';
import type { RosterLessonRow, RosterPackageRow, RosterRuleRow } from './sales-roster.repo';

const DAY_MS = 86_400_000;

/** One row's additions: the weekly slots, the attendance count and the current package. */
export interface RosterFacts {
  weekly: RosterSlot[];
  attendance: RosterAttendance;
  package: SalesPackageSummary | null;
}

/**
 * Each student's package in use, as a Riyadh-midnight instant: packages are used oldest first
 * (renewal-due.ts) and a paid early renewal is active at once, so the EARLIEST active start that is
 * not after now. A student whose only active package starts later has none (the 'recent' basis).
 */
export function packageStarts(rows: readonly RosterPackageRow[], now: Date): Map<string, number> {
  const out = new Map<string, number>();
  for (const row of rows.filter((r) => r.status === 'active')) {
    const at = Date.parse(zonedInstant(row.starts_on, '00:00', RIYADH_TZ));
    const earliest = Math.min(at, out.get(row.student_id) ?? Infinity);
    if (at <= now.getTime()) out.set(row.student_id, earliest);
  }
  return out;
}

/** The earliest instant any row counts from: a package start or now − ROSTER_RECENT_DAYS. */
export function rosterFrom(starts: ReadonlyMap<string, number>, now: Date): Date {
  const recent = now.getTime() - ROSTER_RECENT_DAYS * DAY_MS;
  return new Date(Math.min(recent, ...starts.values()));
}

interface RosterParts {
  rules: readonly RosterRuleRow[];
  starts: ReadonlyMap<string, number>;
  lessons: readonly RosterLessonRow[];
  packages: ReadonlyMap<string, SalesPackageSummary>;
}

function slotsOf(rules: readonly RosterRuleRow[], id: string, now: Date): RosterSlot[] {
  return rules
    .filter((r) => r.student_id === id)
    .flatMap((r) => toWeeklySlot(r.rule, now) ?? [])
    .sort((a, b) => (a.next[0] ?? '').localeCompare(b.next[0] ?? ''))
    .map(({ next, teacher }) => ({ next, teacher }));
}

const inWindow = (at: number, from: number, now: Date): boolean => at >= from && at < now.getTime();

/** Present / held since the active package started, else over the last ROSTER_RECENT_DAYS days. */
function attendanceOf(p: RosterParts, id: string, now: Date): RosterAttendance {
  const start = p.starts.get(id);
  const from = start ?? now.getTime() - ROSTER_RECENT_DAYS * DAY_MS;
  const kinds = p.lessons
    .filter((l) => l.student_id === id)
    .filter((l) => inWindow(Date.parse(l.lesson.starts_at), from, now))
    .map((l) => attendanceKind(l.lesson.status, l.attendance));
  return rosterAttendance(kinds, start === undefined ? 'recent' : 'subscription');
}

/** The facts of every student of the page, by id. */
export function toRoster(
  ids: readonly string[],
  p: RosterParts,
  now: Date,
): Map<string, RosterFacts> {
  const factsOf = (id: string): RosterFacts => ({
    weekly: slotsOf(p.rules, id, now),
    attendance: attendanceOf(p, id, now),
    package: p.packages.get(id) ?? null,
  });
  return new Map(ids.map((id) => [id, factsOf(id)]));
}
