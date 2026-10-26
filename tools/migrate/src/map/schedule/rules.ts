// schedule_rules + schedule_rule_students ← bookings.ts, then the HEART timetables
// (heart.rules.ts; the later row wins, B1). Imported rules keep rule_id off past lessons (reports
// make those). The importer creates no lesson for a rule: the API's daily horizon job
// (OccurrenceGenerator.topUp) books every active rule from max(now, starts_on) to
// booking_horizon_weeks ahead, idempotent on (rule_id, starts_at), as `scheduled` lessons with
// confirmed_at null; Google sync skips them because the rule has an import item.
import type { EntityModule, SourceBundle, WriteContext } from '../../entities/contract.ts';
import { keyId, keys } from '../../keys.ts';
import { accepted, issueOnly, issuesFor } from '../../sources/sheets/issues.ts';
import type { Mapped, SourceRef } from '../../types.ts';
import { type RuleResult, bookingRules } from './bookings.ts';
import { heartRules } from './heart.rules.ts';
import { studentIndex } from '../people/match.ts';

const SLOT = /@\d{2}:\d{2}$/;

/**
 * Booking rules, then HEART rules. A HEART row split by time (key …@HH:mm) replaces a booking rule
 * of the same teacher + students, which is sent to review instead of running twice.
 */
function allRules(bundle: SourceBundle): RuleResult[] {
  const heart = heartRules(bundle, studentIndex(bundle.earlier.get('students')));
  const split = new Set(
    heart.flatMap((r) => ('key' in r && SLOT.test(r.key.key) ? [r.key.key.replace(SLOT, '')] : [])),
  );
  const booked = bookingRules(bundle).map((r): RuleResult => {
    if (!('key' in r) || !split.has(r.key.key)) return r;
    const detail = 'replaced by the HEART timetable (different times per day)';
    const issue = issuesFor(
      'schedule_rules',
      r.ref,
    )({ code: 'conflict', severity: 'review', detail });
    return { ref: r.ref, issues: [issue] };
  });
  return [...booked, ...heart];
}

function mapRules(bundle: SourceBundle): Mapped[] {
  return allRules(bundle).flatMap((r) =>
    'key' in r
      ? [accepted({ key: r.key, ref: r.ref, ...r.record, issues: r.issues })]
      : issueOnly(r.issues),
  );
}

const sameRow = (a: SourceRef, b: SourceRef | undefined) =>
  a.source === b?.source && a.tab === b.tab && a.row === b.row;

/** Links of the booking row that won resolve for each rule (issues were raised by mapRules). */
function mapRuleStudents(bundle: SourceBundle): Mapped[] {
  const kept = new Map(
    (bundle.earlier.get('schedule_rules') ?? []).map((d) => [keyId(d.key), d.ref]),
  );
  return allRules(bundle).flatMap((r) => {
    if (!('key' in r) || !sameRow(r.ref, kept.get(keyId(r.key)))) return [];
    return r.students.map((student) =>
      accepted({
        key: keys.scheduleRuleStudent({ rule: r.key.key, student: student.key }),
        ref: r.ref,
        columns: {},
        refs: { rule_id: r.key, student_id: student },
      }),
    );
  });
}

/** Link tables have no id: insert … on conflict do nothing (an unchanged pair is a no-op). */
async function writeLink(ctx: WriteContext, table: string) {
  await ctx.tx.insert({ table, columns: ctx.columns, returning: null });
  return { targetId: null };
}

export const scheduleRulesModule: EntityModule = {
  entity: 'schedule_rules',
  table: 'schedule_rules',
  prefer: 'last', // B1: the latest booking row of a teacher + student set wins
  map: mapRules,
};

export const scheduleRuleStudentsModule: EntityModule = {
  entity: 'schedule_rule_students',
  table: 'schedule_rule_students',
  map: mapRuleStudents,
  write: (ctx) => writeLink(ctx, 'schedule_rule_students'),
};
