// «تقويم الحجوزات» (HUB, then BOOK) weekly rows with status مؤكد / مشترك / يحتاج تأكيد → rules
// from the import date on (booking-slot.ts); one-off rows are lessons (one-offs.ts). The teacher
// column, when empty, gives way to the student's teacher. Times are the sheet's wall clock in
// Asia/Riyadh. Lessons of these rules come from the platform's daily horizon job (rules.ts). Pure.
import type { SourceBundle } from '../../entities/contract.ts';
import { keys } from '../../keys.ts';
import { text } from '../../sources/sheets/cells.ts';
import { type IssueInput, issuesFor } from '../../sources/sheets/issues.ts';
import { packageSize } from '../../sources/values.ts';
import type { NaturalKey, RowIssue, SourceRow, TargetRecord } from '../../types.ts';
import { type StudentIndex, studentIndex } from '../people/match.ts';
import { bookingWho } from './booking-row.ts';
import { bookingRows, bookingSlot } from './booking-slot.ts';

export const SHEET_TZ = 'Asia/Riyadh';

export interface BookingRule {
  ref: SourceRow['ref'];
  key: NaturalKey;
  students: NaturalKey[];
  record: TargetRecord;
  issues: RowIssue[];
}

export type RuleResult = BookingRule | { ref: SourceRow['ref']; issues: RowIssue[] };

/** The first day lessons may be created: `--from`, else the run's local date. */
export const importFrom = (bundle: Pick<SourceBundle, 'from' | 'today'>): string =>
  bundle.from ?? bundle.today;

function ruleOf(
  row: SourceRow,
  o: { ix: StudentIndex; today: string; from: string },
): RuleResult | null {
  const f = row.fields;
  const issue = issuesFor('schedule_rules', row.ref);
  const fail = (i: IssueInput) => ({ ref: row.ref, issues: [issue(i)] });
  const slot = bookingSlot(f, o.from);
  if (slot.kind === 'issue' && text(f['recurrence'])) return fail(slot.issue);
  if (slot.kind !== 'rule') return null;
  const who = bookingWho(row, o.ix);
  if (!('teacher' in who)) return fail(who);
  const pkgText = text(f['package_text']);
  const pkg = packageSize(pkgText) ?? null;
  const issues =
    pkgText && !pkg
      ? [issue({ code: 'unmapped_value', severity: 'warn', field: 'package_text' })]
      : [];
  const { rec } = slot;
  return {
    ref: row.ref,
    key: keys.scheduleRule({ teacher: who.teacher, students: who.students.map((k) => k.key) }),
    students: who.students,
    issues,
    record: {
      columns: {
        duration_min: slot.duration,
        start_time_local: slot.time,
        tz: SHEET_TZ,
        byday: rec.byday,
        starts_on: slot.startsOn,
        ends_on: rec.until,
        status: rec.until && rec.until < o.today ? 'ended' : 'active',
        package: pkg,
      },
      refs: { teacher_id: keys.teacher(who.teacher) },
    },
  };
}

/** HUB rows first, BOOK after: with prefer 'last' the later (newer sync) row wins (B1). */
export function bookingRules(bundle: SourceBundle): RuleResult[] {
  const ix = studentIndex(bundle.earlier.get('students'));
  const o = { ix, today: bundle.today, from: importFrom(bundle) };
  return bookingRows(bundle.sheets).flatMap((r) => ruleOf(r, o) ?? []);
}
