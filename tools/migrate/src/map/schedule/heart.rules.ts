// HEART weekly timetables (one tab per teacher: ABRAR, RABIA, HEND) → schedule rules (docs/06).
// Customer name → HEART «subscription» row → phone → student. The day cells hold the start time;
// HEART records no duration and no zone, so 45 min and Asia/Riyadh are assumed (warn on every
// rule; RUNBOOK asks the owner). Days with different times become one rule per time. Pure.
import type { SourceBundle } from '../../entities/contract.ts';
import { keys } from '../../keys.ts';
import { hhmm, num, phoneCell, text, ymd } from '../../sources/sheets/cells.ts';
import { issuesFor } from '../../sources/sheets/issues.ts';
import { weekday } from '../../sources/values.schedule.ts';
import { teacherFromText } from '../../sources/values.ts';
import type { NaturalKey, SourceRow } from '../../types.ts';
import { packageOf } from '../money/heart.ts';
import { type StudentIndex, findStudent } from '../people/match.ts';
import { type RuleResult, SHEET_TZ } from './bookings.ts';

const HEART_TIMETABLES = ['heart_abrar', 'heart_rabia', 'heart_hend'] as const;
const DAYS = ['sun', 'mon', 'tue', 'wed', 'thu', 'fri', 'sat'] as const;
const lower = (s: string | null) => (s ?? '').trim().toLowerCase();

/** start time → weekdays (0 = Sunday) of one timetable row. */
function slots(f: SourceRow['fields']): Map<string, number[]> {
  const out = new Map<string, number[]>();
  for (const d of DAYS) {
    const time = hhmm(f[d]);
    const day = weekday(d);
    if (time && day !== undefined) out.set(time, [...(out.get(time) ?? []), day]);
  }
  return out;
}

interface Ctx {
  ix: StudentIndex;
  subs: readonly SourceRow[];
  teacher: string;
  today: string;
}

type Matched = { ok: true; sub: SourceRow; student: NaturalKey } | { ok: false; detail: string };

function matchStudent(name: string, o: Ctx): Matched {
  const sub = o.subs.find((s) => lower(text(s.fields.name)) === lower(name));
  const phone = phoneCell(sub?.fields.phone);
  if (!sub || !phone.ok) return { ok: false, detail: 'no HEART subscription row with a phone' };
  const found = findStudent(o.ix, { phone: phone.e164, name });
  if (!found.ok) return { ok: false, detail: found.reason };
  return { ok: true, sub, student: found.student.key };
}

const lessonTotal = (sub: SourceRow): number =>
  (num(sub.fields.lessons_used) ?? 0) + (num(sub.fields.lessons_remaining) ?? 0);

interface Slot {
  time: string;
  byday: number[];
  severalTimes: boolean;
}

function heartRule(row: SourceRow, m: { sub: SourceRow; student: NaturalKey }, o: Ctx & Slot) {
  return {
    ref: row.ref,
    key: keys.scheduleRule({
      teacher: o.teacher,
      students: [m.student.key],
      slot: o.severalTimes ? o.time : undefined,
    }),
    students: [m.student],
    issues: [
      issuesFor(
        'schedule_rules',
        row.ref,
      )({
        code: 'missing_field',
        severity: 'warn',
        field: 'duration_min,tz',
        detail: 'HEART timetable: 45 min Asia/Riyadh assumed',
      }),
    ],
    record: {
      columns: {
        duration_min: 45,
        start_time_local: o.time,
        tz: SHEET_TZ,
        byday: o.byday,
        starts_on: ymd(m.sub.fields.date) ?? o.today,
        ends_on: null,
        status: 'active',
        package: packageOf(lessonTotal(m.sub)),
      },
      refs: { teacher_id: keys.teacher(o.teacher) },
    },
  };
}

function ruleRows(row: SourceRow, o: Ctx): RuleResult[] {
  const name = text(row.fields.name);
  const times = slots(row.fields);
  if (!name || times.size === 0) return []; // no booked days: nothing to schedule
  const m = matchStudent(name, o);
  if (!m.ok) {
    const detail = m.detail;
    const issue = issuesFor('schedule_rules', row.ref);
    return [
      {
        ref: row.ref,
        issues: [issue({ code: 'missing_ref', severity: 'review', field: 'student', detail })],
      },
    ];
  }
  const severalTimes = times.size > 1;
  return [...times].map(([time, byday]) => heartRule(row, m, { ...o, time, byday, severalTimes }));
}

/** Every timetable row of every teacher tab, after the bookings (prefer 'last': HEART wins). */
export function heartRules(bundle: SourceBundle, ix: StudentIndex): RuleResult[] {
  const subs = bundle.sheets.heart_subscriptions ?? [];
  return HEART_TIMETABLES.flatMap((id) => {
    const teacher = teacherFromText(id.replace(/^heart_/, ''));
    if (!teacher) return [];
    const ctx = { ix, subs, teacher, today: bundle.today };
    return (bundle.sheets[id] ?? []).flatMap((r) => ruleRows(r, ctx));
  });
}
