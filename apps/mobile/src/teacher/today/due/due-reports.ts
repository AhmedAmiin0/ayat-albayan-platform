import { reportStage, type ReportStage } from '@ab/client-core';
import type { LessonView, PendingReportView } from '@ab/shared';

// «تقارير لم تُكتب بعد» on the teacher's «اليوم» (docs/48): one row per lesson, each due report
// shown once. Pure, so the block only lays it out.

/**
 * Where «عرض الباقي (N)» goes: today's «التقارير» pending pill. docs/47 PR 2 points this one
 * constant at '/teacher/reports/pending' when that list lands.
 */
export const PENDING_REPORTS_HREF = '/teacher/reports';

export type DueStage = 'write' | 'resume';

export interface DueReport {
  lessonId: string;
  startsAt: string;
  names: string[];
  stage: DueStage;
}

interface DueInput {
  /** Today's lessons (lessonsOn over the ahead read), earliest first. */
  today: readonly LessonView[];
  /** GET /teachers/me/pending-reports; undefined while it loads or failed with nothing cached. */
  pending: readonly PendingReportView[] | undefined;
  /** The hero's lesson: its report is the hero's own button, never a row here too. */
  heroId: string | undefined;
  now: Date;
}

const isDue = (stage: ReportStage | null): stage is DueStage =>
  stage === 'write' || stage === 'resume';

/** Today's lesson as a row while its report is to write or finish (from students[].report). */
function todayRow(lesson: LessonView, now: Date): DueReport[] {
  const stage = reportStage(lesson, now);
  if (!isDue(stage)) return [];
  const names = lesson.students.map((s) => s.name);
  return [{ lessonId: lesson.id, startsAt: lesson.starts_at, names, stage }];
}

/** One pending student folded into its lesson's row: «أكمل» once any student has a draft. */
const merge = (seen: DueReport | undefined, row: PendingReportView): DueReport => ({
  lessonId: row.lesson_id,
  startsAt: row.starts_at,
  names: [...(seen?.names ?? []), row.student.name],
  stage: seen?.stage === 'resume' || row.report_id !== null ? 'resume' : 'write',
});

/** The older pending rows, one per lesson, oldest first. */
function groupPending(rows: readonly PendingReportView[]): DueReport[] {
  const byLesson = new Map<string, DueReport>();
  for (const row of rows) byLesson.set(row.lesson_id, merge(byLesson.get(row.lesson_id), row));
  return [...byLesson.values()].sort((a, b) => a.startsAt.localeCompare(b.startsAt));
}

/**
 * Today's due lessons first (a lesson that started after the pending read still shows), then the
 * older pending lessons not among today's; the hero's lesson is left out of both.
 */
export function dueReports({ today, pending, heroId, now }: DueInput): DueReport[] {
  const todayIds = new Set(today.map((l) => l.id));
  const older = (pending ?? []).filter((r) => !todayIds.has(r.lesson_id));
  const rows = [...today.flatMap((l) => todayRow(l, now)), ...groupPending(older)];
  return rows.filter((r) => r.lessonId !== heroId);
}
