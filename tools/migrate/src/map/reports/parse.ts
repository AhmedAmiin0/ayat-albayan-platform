// One «تقارير الحلقات» row → a completed lesson + its report, or why not (A2, A3, A5, A6). Pure.
// Student and teacher: parse.who.ts.
import type { Enums } from '@ab/db';
import { keys } from '../../keys.ts';
import { dateTime, text, ymd } from '../../sources/sheets/cells.ts';
import { type IssueInput, issuesFor } from '../../sources/sheets/issues.ts';
import { cellsOf, testReason } from '../../sources/sheets/test-rows.ts';
import { attendance } from '../../sources/values.ts';
import { inWindow, zonedToUtc } from '../../time.ts';
import type { ColumnValue, NaturalKey, RowIssue, SourceRow } from '../../types.ts';
import { meetingLink } from '../teachers/teachers.ts';
import type { StudentIndex } from '../people/match.ts';
import { SHEET_TZ } from '../schedule/bookings.ts';
import { TEXT_FIELDS, isTrial, lessonNumber, reportBody, reportNames, wasSent } from './fields.ts';
import { reportWho } from './parse.who.ts';
import { type Slot, UNKNOWN_TIME } from './times.ts';

/** A6: reports before the academy's start or in the future are typos/tests (2066, 1996). */
const REPORTS_FROM = '2026-08-01';

export interface ParsedReport {
  ref: SourceRow['ref'];
  teacher: string;
  student: NaturalKey;
  date: string;
  startsAt: string;
  endsAt: string;
  attendance: Enums<'attendance'>;
  trial: boolean;
  /** A5 text, normalized: tells a resubmission from another lesson typed with the same date. */
  lessonNo: string;
  /** Every spelling of the student on the row (registry, locked, typed): PDF folder matching. */
  names: string[];
  sent: boolean;
  meetingLink: string | null;
  submittedAt: string;
  body: Record<string, ColumnValue>;
  lessonKey: NaturalKey;
  reportKey: NaturalKey;
  issues: RowIssue[];
}

interface ReportCtx {
  ix: StudentIndex;
  slots: ReadonlyMap<string, Slot>;
  today: string;
}

function gate(row: SourceRow, today: string): IssueInput | string {
  const f = row.fields;
  const reason = testReason({
    names: [f['student_name'], f['student_registry_name'], f['teacher'], f['teacher_locked']],
    other: cellsOf(f, [...TEXT_FIELDS, 'send_status']),
  });
  if (reason) return { code: 'test_row', severity: 'reject', detail: reason };
  const date = ymd(f['lesson_date']);
  if (!date || !inWindow({ date, from: REPORTS_FROM, to: today }))
    return { code: 'bad_date', severity: 'reject', field: 'lesson_date', detail: 'outside_window' };
  return date;
}

/** Riyadh wall clock (+ offset) → UTC ISO (rule 6). */
function utc(o: { date: string; time: string; plusMs?: number }): string {
  const t = zonedToUtc({ date: o.date, time: o.time, tz: SHEET_TZ }).getTime();
  return new Date(t + (o.plusMs ?? 0)).toISOString();
}

export function parseReport(row: SourceRow, ctx: ReportCtx): ParsedReport | RowIssue[] {
  const f = row.fields;
  const issue = issuesFor('lesson_reports', row.ref);
  const date = gate(row, ctx.today);
  if (typeof date !== 'string') return [issue(date)];
  const who = reportWho(f, ctx.ix);
  if (!('teacher' in who)) return [issue(who)];
  const { teacher } = who;
  const att = attendance(text(f['attendance']));
  if (!att) return [issue({ code: 'unmapped_value', severity: 'reject', field: 'attendance' })];
  const submitted = dateTime(f['submitted_at']);
  if (!submitted)
    return [issue({ code: 'missing_field', severity: 'reject', field: 'submitted_at' })];
  const student = who.student.key;
  const body = reportBody(f);
  const issues = [
    ...who.issues.map(issue),
    ...body.unmapped.map((field) => issue({ code: 'unmapped_value', severity: 'warn', field })),
  ];
  const booked = ctx.slots.get(`${student.key}|${date}`);
  if (!booked)
    issues.push(
      issue({
        code: 'missing_field',
        severity: 'warn',
        field: 'start_time',
        detail: 'noon_riyadh',
      }),
    );
  const slot = booked ?? UNKNOWN_TIME;
  const lessonKey = keys.lesson({ teacher, students: [student.key], at: date });
  return {
    ref: row.ref,
    teacher,
    student,
    date,
    startsAt: utc({ date, time: slot.time }),
    endsAt: utc({ date, time: slot.time, plusMs: slot.duration * 60_000 }),
    attendance: att,
    trial: isTrial(f),
    lessonNo: lessonNumber(f),
    names: reportNames(f),
    sent: wasSent(f),
    meetingLink: meetingLink(text(f['meeting_link'])),
    submittedAt: utc({ ...submitted, plusMs: submitted.sec * 1000 }),
    body: body.columns,
    lessonKey,
    reportKey: keys.lessonReport({ lesson: lessonKey.key, student: student.key }),
    issues,
  };
}
