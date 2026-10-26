import { Inject, Injectable } from '@nestjs/common';
import { DB, type Db } from '../../../../common/db/db.module';
import { dbError } from '../../../../common/http/http';
import type { ReportAttachmentRow } from '../report-row';

const COLUMNS = 'id, storage_path, mime, size, created_at' as const;

export type NewAttachment = {
  report_id: string;
  storage_path: string;
  mime: string;
  size: number;
  created_by: string;
};

export type PdfNameInput = { code: string; startsAt: Date; tz: string };

/** report_attachments rows (R-REP-02); the objects live in the report-attachments bucket. */
@Injectable()
export class ReportAttachmentsQueries {
  constructor(@Inject(DB) private readonly db: Db) {}

  /** What the PDF's file name is made of (reportFileName): code, lesson start, guardian tz. */
  async pdfName(input: { studentId: string; lessonId: string }): Promise<PdfNameInput | null> {
    const [student, lesson] = await Promise.all([
      this.db.from('students').select('code, guardian:guardians(tz)').eq('id', input.studentId).maybeSingle(),
      this.db.from('lessons').select('starts_at').eq('id', input.lessonId).maybeSingle(),
    ]);
    if (student.error) throw dbError(student.error);
    if (lesson.error) throw dbError(lesson.error);
    if (!student.data?.code || !student.data.guardian || !lesson.data) return null;
    return { code: student.data.code, startsAt: new Date(lesson.data.starts_at), tz: student.data.guardian.tz };
  }

  async add(row: NewAttachment): Promise<ReportAttachmentRow> {
    const { data, error } = await this.db.from('report_attachments').insert(row).select(COLUMNS).single();
    if (error) throw dbError(error);
    return data;
  }

  /** The attachment, only when it belongs to that report. */
  async get(reportId: string, id: string): Promise<ReportAttachmentRow | null> {
    const { data, error } = await this.db
      .from('report_attachments')
      .select(COLUMNS)
      .eq('id', id)
      .eq('report_id', reportId)
      .maybeSingle();
    if (error) throw dbError(error);
    return data;
  }

  async remove(id: string): Promise<void> {
    const { error } = await this.db.from('report_attachments').delete().eq('id', id);
    if (error) throw dbError(error);
  }
}
