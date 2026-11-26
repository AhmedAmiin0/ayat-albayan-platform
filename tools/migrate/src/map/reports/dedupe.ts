// A7: same number or within 30 min is a resubmission; further apart is its own lesson, to review.
import { stableJson } from '../../hash.ts';
import { keyId, keys } from '../../keys.ts';
import { issuesFor } from '../../sources/sheets/issues.ts';
import type { RowIssue } from '../../types.ts';
import type { ParsedReport } from './parse.ts';

interface Deduped {
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

/** Identical copies keep the first; differing ones keep the latest submission. */
function keptOf(group: readonly ParsedReport[], head: ParsedReport) {
  const same = group.every((r) => content(r) === content(head));
  const latest = [...group].sort((a, b) => a.submittedAt.localeCompare(b.submittedAt)).at(-1);
  return { kept: same ? head : (latest ?? head), same };
}

function pickOne(group: readonly ParsedReport[], issues: RowIssue[]): ParsedReport | undefined {
  const [head] = group;
  if (!head) return undefined;
  const { kept, same } = keptOf(group, head);
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
