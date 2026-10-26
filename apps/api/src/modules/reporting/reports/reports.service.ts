import { reportBlock, type ReportDraft, type ReportFormResponse, type ReportView } from '@ab/shared';
import { Injectable } from '@nestjs/common';
import type { AuthUser } from '../../../common/auth/verify-token';
import { conflict, notFound } from '../../../common/http/errors';
import { formResponse } from './submit/report-form.mapper';
import { ReportGate } from './submit/report-gate';
import { ReportLessonQueries } from './report-lesson.queries';
import { formColumns, reportView } from './report.mapper';
import { ReportsQueries } from './reports.queries';

export type DraftInput = { id: string; form: Partial<ReportDraft>; user: AuthUser };

/** Report form, read and autosave (docs/11 §4 R1, R2, R4; R-REP-01/02/04, issues A7, D1). */
@Injectable()
export class ReportsService {
  constructor(
    private readonly gate: ReportGate,
    private readonly queries: ReportsQueries,
    private readonly lessons: ReportLessonQueries,
  ) {}

  /**
   * R1: the lesson's identity (read-only) and one report per student, creating the drafts on first
   * open. A cancelled or moved lesson has no report → 409 lesson_cancelled, nothing created.
   */
  async form(lessonId: string, user: AuthUser): Promise<ReportFormResponse> {
    const lesson = await this.queries.lesson(lessonId);
    if (!lesson) throw notFound('lesson_not_found');
    await this.gate.access.assertTeacherOf(user, lesson);
    const ctx = await this.gate.context(user);
    const block = reportBlock({ lessonStatus: lesson.status, lessonStartsAt: new Date(lesson.starts_at), now: ctx.now });
    if (block === 'lesson_cancelled') throw conflict(block);
    await this.queries.ensureDrafts(lesson, user.id);
    const ids = lesson.lesson_students.map((s) => s.student_id);
    const [reports, numbers, packages] = await Promise.all([
      this.queries.byLesson(lesson.id),
      this.lessons.lessonNumbers(lesson, ids),
      this.lessons.packages(ids),
    ]);
    return formResponse({ lesson, reports, numbers, packages, ctx, block });
  }

  /** R4. */
  async get(id: string, user: AuthUser): Promise<ReportView> {
    const row = await this.gate.load(id, user);
    return reportView(row, await this.gate.context(user));
  }

  /**
   * R2 autosave: writes only the fields sent, last write wins. A submitted report is edited
   * through submit only (409 already_submitted).
   */
  async draft({ id, form, user }: DraftInput): Promise<ReportView> {
    const row = await this.gate.load(id, user);
    if (row.status !== 'draft') throw conflict('already_submitted');
    const saved = await this.queries.updateDraft(id, formColumns(form));
    if (!saved) throw conflict('already_submitted');
    return reportView(saved, await this.gate.context(user));
  }
}
