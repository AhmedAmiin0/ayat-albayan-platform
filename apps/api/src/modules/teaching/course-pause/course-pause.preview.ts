import {
  addDays,
  coursePauseProblem,
  pausedDays,
  resumeDayOf,
  riyadhToday,
  RIYADH_TZ,
  startOfLocalDay,
  type CoursePausePreview,
  type CourseResumePreview,
} from '@ab/shared';
import { Injectable } from '@nestjs/common';
import { badRequest, conflict, notFound } from '@/common/http/errors';
import { CoursePauseRepo } from './course-pause.repo';

/** Riyadh midnight at the start of `date` (UTC instant). */
const riyadhStart = (date: string): Date => startOfLocalDay(date, RIYADH_TZ);

/** The days a resume on the day after `until` moves the package; null = open-ended (counted then). */
const extendDaysOf = (from: string, until: string | null): number | null =>
  until === null ? null : pausedDays({ from, until, today: addDays(until, 1) });

/**
 * What a pause or a resume would do, before the confirm (owner 2026-11-17: «every action previews
 * what will happen»): the lessons, their dates, the days the package moves. Nothing written.
 */
@Injectable()
export class CoursePausePreviews {
  constructor(private readonly queries: CoursePauseRepo) {}

  /** The sheet's «ستُلغى N حلقات»: open lessons from max(now, from) until the day after until (or all). */
  async preview(studentId: string, q: { from?: string; until?: string }): Promise<CoursePausePreview> {
    await this.assertStudent(studentId);
    const from = q.from ?? riyadhToday();
    const until = q.until ?? null;
    const problem = coursePauseProblem({ from, until, today: riyadhToday() });
    if (problem) throw badRequest(problem);
    const start = new Date(Math.max(Date.now(), riyadhStart(from).getTime()));
    const end = until === null ? null : riyadhStart(addDays(until, 1));
    const starts = await this.queries.previewStarts({ studentId, start, end });
    const extend = extendDaysOf(from, until);
    return { from_date: from, until_date: until, lessons: starts.length, starts, extend_days: extend };
  }

  /** «استئناف الدورة الآن؟»: the lessons booked back from today and the days the package moves. */
  async resume(studentId: string): Promise<CourseResumePreview> {
    await this.assertStudent(studentId);
    const open = await this.queries.openPause(studentId);
    const row = open ? await this.queries.pause(open.id) : null;
    if (!row) throw conflict('pause_not_open');
    const today = riyadhToday();
    const cutoff = riyadhStart(resumeDayOf({ until: row.until_date, today }));
    const back = await this.queries.pausedBack(row.id, cutoff);
    const started = row.from_date <= today;
    const days = started ? pausedDays({ from: row.from_date, until: row.until_date, today }) : 0;
    return { back, extendDays: days };
  }

  private async assertStudent(studentId: string): Promise<void> {
    if (!(await this.queries.studentExists(studentId))) throw notFound('student_not_found');
  }
}
