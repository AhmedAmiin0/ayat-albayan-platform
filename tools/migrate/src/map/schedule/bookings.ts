// «تقويم الحجوزات» (HUB, then BOOK) rows with status مؤكد/مشترك and a weekly «التكرار» → rules.
// One-off rows (the free trial) are not rules (docs/06) and their past dates have no report, so
// they are skipped. The teacher column is empty on every confirmed row of the export: the rule
// then takes the student's teacher. Times are the sheet's wall clock in Asia/Riyadh. Pure.
import type { SourceBundle } from '../../entities/contract.ts';
import { keys } from '../../keys.ts';
import { hhmm, num, phoneCell, text, ymd } from '../../sources/sheets/cells.ts';
import { type IssueInput, issuesFor } from '../../sources/sheets/issues.ts';
import { splitSiblings } from '../../sources/sheets/siblings.ts';
import { testReason } from '../../sources/sheets/test-rows.ts';
import { type Recurrence, bookingStatus, parseRecurrence } from '../../sources/values.schedule.ts';
import { packageSize, teacherFromText } from '../../sources/values.ts';
import type { NaturalKey, RowIssue, SourceRow, TargetRecord } from '../../types.ts';
import { type StudentIndex, findStudent, studentIndex } from '../people/match.ts';

export const SHEET_TZ = 'Asia/Riyadh';
const DURATIONS = new Set([30, 45, 60, 90]);

export interface BookingRule {
  ref: SourceRow['ref'];
  key: NaturalKey;
  students: NaturalKey[];
  record: TargetRecord;
  issues: RowIssue[];
}

export type RuleResult = BookingRule | { ref: SourceRow['ref']; issues: RowIssue[] };

function studentsOf(row: SourceRow, ix: StudentIndex): NaturalKey[] | IssueInput {
  const phone = phoneCell(row.fields['phone']);
  const raw = text(row.fields['name']);
  const reason = testReason({
    names: [raw, row.fields['teacher']],
    phone: phone.ok ? phone.e164 : null,
  });
  if (reason) return { code: 'test_row', severity: 'reject', detail: reason };
  if (!phone.ok)
    return { code: 'bad_phone', severity: 'reject', field: 'phone', detail: phone.reason };
  if (!raw) return { code: 'missing_field', severity: 'reject', field: 'name' };
  const out: NaturalKey[] = [];
  for (const name of splitSiblings(raw)) {
    const r = findStudent(ix, { phone: phone.e164, name });
    if (!r.ok)
      return { code: 'missing_ref', severity: 'reject', field: 'student', detail: r.reason };
    out.push(r.student.key);
  }
  return out;
}

function teacherOf(row: SourceRow, ix: StudentIndex, students: NaturalKey[]): string | IssueInput {
  const raw = text(row.fields['teacher']);
  if (raw) {
    const slug = teacherFromText(raw);
    return slug ?? { code: 'unknown_teacher', severity: 'reject', field: 'teacher' };
  }
  const ids = new Set(students.map((k) => k.key));
  const own = ix.all.find((s) => ids.has(s.key.key) && s.record.refs['teacher_id']);
  return (
    own?.record.refs['teacher_id']?.key ?? {
      code: 'missing_field',
      severity: 'reject',
      field: 'teacher',
    }
  );
}

interface Slot {
  rec: Recurrence;
  date: string;
  time: string;
  duration: number;
}

/** When the rule runs; null = not a rule (unconfirmed or one-off trial). */
function slotOf(f: SourceRow['fields']): Slot | IssueInput | null {
  const s = bookingStatus(text(f['status']));
  const rec = parseRecurrence(text(f['recurrence']));
  if ((s !== 'confirmed' && s !== 'subscribed') || rec === null) return null;
  if (rec === undefined) return { code: 'unmapped_value', severity: 'reject', field: 'recurrence' };
  const date = ymd(f['date']);
  const time = hhmm(f['start_time']);
  const duration = num(f['duration_min']);
  if (!date || !time || duration === null || !DURATIONS.has(duration))
    return { code: 'missing_field', severity: 'reject', field: 'date,start_time,duration_min' };
  if (rec.until && rec.until < date)
    return { code: 'bad_date', severity: 'reject', field: 'recurrence' };
  return { rec, date, time, duration };
}

function ruleOf(row: SourceRow, o: { ix: StudentIndex; today: string }): RuleResult | null {
  const f = row.fields;
  const issue = issuesFor('schedule_rules', row.ref);
  const fail = (i: IssueInput) => ({ ref: row.ref, issues: [issue(i)] });
  const slot = slotOf(f);
  if (!slot) return null;
  if (!('rec' in slot)) return fail(slot);
  const { rec, date, time, duration } = slot;
  const students = studentsOf(row, o.ix);
  if (!Array.isArray(students)) return fail(students);
  const teacher = teacherOf(row, o.ix, students);
  if (typeof teacher !== 'string') return fail(teacher);
  const pkgText = text(f['package_text']);
  const pkg = packageSize(pkgText) ?? null;
  const issues =
    pkgText && !pkg
      ? [issue({ code: 'unmapped_value', severity: 'warn', field: 'package_text' })]
      : [];
  return {
    ref: row.ref,
    key: keys.scheduleRule({ teacher, students: students.map((k) => k.key) }),
    students,
    issues,
    record: {
      columns: {
        duration_min: duration,
        start_time_local: time,
        tz: SHEET_TZ,
        byday: rec.byday,
        starts_on: date,
        ends_on: rec.until,
        status: rec.until && rec.until < o.today ? 'ended' : 'active',
        package: pkg,
      },
      refs: { teacher_id: keys.teacher(teacher) },
    },
  };
}

/** HUB rows first, BOOK after: with prefer 'last' the later (newer sync) row wins (B1). */
export function bookingRules(bundle: SourceBundle): RuleResult[] {
  const ix = studentIndex(bundle.earlier.get('students'));
  const rows = [
    ...(bundle.sheets['hub_bookings'] ?? []),
    ...(bundle.sheets['book_bookings'] ?? []),
  ];
  return rows.flatMap((r) => ruleOf(r, { ix, today: bundle.today }) ?? []);
}
