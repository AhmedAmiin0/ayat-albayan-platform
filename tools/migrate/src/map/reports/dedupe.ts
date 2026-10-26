// A7: several form submissions for one student, teacher and day. Pure.
// Same «رقم الحلقة»: a resubmission — identical content keeps the first (warn), different content
// keeps the latest (the teacher's correction) and sends the older to review.
// Different «رقم الحلقة» sent within 30 minutes: a correction with a retyped number — handled as a
// resubmission (latest kept, older to review), not as a second chargeable lesson.
// Different «رقم الحلقة» further apart: another lesson typed with the same date — kept as its own
// lesson (natural key «date#2») and sent to review so the owner fixes the date; dropping it would
// lose a real lesson from the package balance and the teacher's payout.
import { stableJson } from '../../hash.ts';
import { keyId, keys } from '../../keys.ts';
import { issuesFor } from '../../sources/sheets/issues.ts';
import type { RowIssue } from '../../types.ts';
import type { ParsedReport } from './parse.ts';

export interface Deduped {
  reports: ParsedReport[];
  issues: RowIssue[];
}

/** What the teacher reported, without when the form was sent. */
const content = (r: ParsedReport): string =>
  stableJson({ b: r.body, a: r.attendance, s: r.startsAt, e: r.endsAt, m: r.meetingLink });

const RESUBMIT_WINDOW_MS = 30 * 60_000;

/** One day's reports → lessons: same number, or sent within the window of a member, = one. */
function lessonsOf(day: readonly ParsedReport[]): ParsedReport[][] {
  const bySent = [...day].sort((a, b) => a.submittedAt.localeCompare(b.submittedAt));
  const near = (a: ParsedReport, b: ParsedReport) =>
    Math.abs(Date.parse(a.submittedAt) - Date.parse(b.submittedAt)) <= RESUBMIT_WINDOW_MS;
  const groups: ParsedReport[][] = [];
  for (const r of bySent) {
    const g = groups.find((g) => g.some((m) => m.lessonNo === r.lessonNo || near(m, r)));
    if (g) g.push(r);
    else groups.push([r]);
  }
  return groups;
}

function groupBy(list: readonly ParsedReport[], by: (r: ParsedReport) => string) {
  const out = new Map<string, ParsedReport[]>();
  for (const r of list) out.set(by(r), [...(out.get(by(r)) ?? []), r]);
  return [...out.values()];
}

function pickOne(group: readonly ParsedReport[], issues: RowIssue[]): ParsedReport | undefined {
  const [head] = group;
  if (!head) return undefined;
  const same = group.every((r) => content(r) === content(head));
  const latest = [...group].sort((a, b) => a.submittedAt.localeCompare(b.submittedAt)).at(-1);
  const kept = same ? head : (latest ?? head);
  for (const r of group) {
    if (r === kept) continue;
    issues.push(
      issuesFor(
        'lesson_reports',
        r.ref,
      )({
        code: same ? 'duplicate' : 'conflict',
        severity: same ? 'warn' : 'review',
        detail: `kept=${kept.ref.source}:${kept.ref.row}`,
      }),
    );
  }
  return kept;
}

/** The n-th distinct lesson of one day gets its own natural key: at = 'YYYY-MM-DD#n'. */
function asOtherLesson(r: ParsedReport, n: number): ParsedReport {
  const lessonKey = keys.lesson({
    teacher: r.teacher,
    students: [r.student.key],
    at: `${r.date}#${n}`,
  });
  return {
    ...r,
    lessonKey,
    reportKey: keys.lessonReport({ lesson: lessonKey.key, student: r.student.key }),
  };
}

export function dedupe(list: readonly ParsedReport[]): Deduped {
  const reports: ParsedReport[] = [];
  const issues: RowIssue[] = [];
  for (const day of groupBy(list, (r) => keyId(r.reportKey))) {
    lessonsOf(day).forEach((lesson, i) => {
      const kept = pickOne(lesson, issues);
      if (!kept) return;
      if (i === 0) return void reports.push(kept);
      reports.push(asOtherLesson(kept, i + 1));
      issues.push(
        issuesFor(
          'lesson_reports',
          kept.ref,
        )({
          code: 'conflict',
          severity: 'review',
          field: 'lesson_date',
          detail: `same_day_lesson=${i + 1}`,
        }),
      );
    });
  }
  return { reports, issues };
}
