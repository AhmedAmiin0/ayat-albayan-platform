import { Inject, Injectable } from '@nestjs/common';
import { DB, type Db } from '../../common/db/db.module';
import { dbError } from '../../common/http/http';
import type { FormColumns } from './report.mapper';
import {
  REPORT_LESSON_SELECT,
  REPORT_SELECT,
  type ReportLessonRow,
  type ReportRow,
} from './report-row';
import { callSubmitReport } from './report-rpc';
import type { SubmitPayload } from './submit-plan';

/** lesson_reports reads and writes (service role — the services guard every call). R-REP-01..04. */
@Injectable()
export class ReportsQueries {
  constructor(@Inject(DB) private readonly db: Db) {}

  async get(id: string): Promise<ReportRow | null> {
    const { data, error } = await this.db.from('lesson_reports').select(REPORT_SELECT).eq('id', id).maybeSingle();
    if (error) throw dbError(error);
    return data;
  }

  async byLesson(lessonId: string): Promise<ReportRow[]> {
    const { data, error } = await this.db
      .from('lesson_reports')
      .select(REPORT_SELECT)
      .eq('lesson_id', lessonId)
      .order('student_id');
    if (error) throw dbError(error);
    return data;
  }

  /** The lesson with its teacher and students (identity for the form, outcome for a submit). */
  async lesson(id: string): Promise<ReportLessonRow | null> {
    const { data, error } = await this.db.from('lessons').select(REPORT_LESSON_SELECT).eq('id', id).maybeSingle();
    if (error) throw dbError(error);
    return data;
  }

  /**
   * One draft per student on the lesson, created on first open (R-REP-04: unique (lesson_id,
   * student_id), `do nothing` → idempotent). Attendance already marked on the lesson is prefilled.
   */
  async ensureDrafts(lesson: ReportLessonRow, actorId: string): Promise<void> {
    const rows = lesson.lesson_students.map((s) => ({
      lesson_id: lesson.id,
      student_id: s.student_id,
      teacher_id: lesson.teacher_id,
      attendance: s.attendance,
      program: s.student?.program ?? null,
      created_by: actorId,
    }));
    if (rows.length === 0) return;
    const { error } = await this.db
      .from('lesson_reports')
      .upsert(rows, { onConflict: 'lesson_id,student_id', ignoreDuplicates: true });
    if (error) throw dbError(error);
  }

  /** Autosave: only while still a draft. null = no draft row matched (missing or submitted). */
  async updateDraft(id: string, columns: FormColumns): Promise<ReportRow | null> {
    const { data, error } = await this.db
      .from('lesson_reports')
      .update(columns)
      .eq('id', id)
      .eq('status', 'draft')
      .select(REPORT_SELECT)
      .maybeSingle();
    if (error) throw dbError(error);
    return data;
  }

  /** submit_report (migration 130): 409 version_conflict / lesson_cancelled / invalid_transition. */
  submit(payload: SubmitPayload): Promise<void> {
    return callSubmitReport(this.db, payload);
  }

  /** R12: failed → pending (compare-and-set); false when the PDF had not failed. */
  async retryPdf(id: string): Promise<boolean> {
    const { data, error } = await this.db
      .from('lesson_reports')
      .update({ pdf_status: 'pending', pdf_error: null })
      .eq('id', id)
      .eq('pdf_status', 'failed')
      .select('id');
    if (error) throw dbError(error);
    return data.length > 0;
  }

  /** A submitted report never asked for a PDF: request it (ReportPdfQueue default). */
  async requestPdf(id: string): Promise<void> {
    const { error } = await this.db
      .from('lesson_reports')
      .update({ pdf_status: 'pending', pdf_error: null })
      .eq('id', id)
      .eq('status', 'submitted')
      .is('pdf_status', null);
    if (error) throw dbError(error);
  }
}
