import type { Tables } from '@ab/db';
import { Inject, Injectable } from '@nestjs/common';
import { DB, type Db } from '@/common/db/db.module';
import { dbError } from '@/common/http/http';

export interface AssetStudent {
  id: string;
  name: string;
  code: string | null;
}

export type AssetReportRow = Pick<
  Tables<'lesson_reports'>,
  'id' | 'student_id' | 'pdf_status' | 'sent_at' | 'status'
>;

export type AssetRecordingRow = Tables<'lesson_recordings'>;

/** The other assets of one lesson for staff: its students, their reports, its recordings. */
@Injectable()
export class LessonAssetsRepo {
  constructor(@Inject(DB) private readonly db: Db) {}

  async students(lessonId: string): Promise<AssetStudent[]> {
    const { data, error } = await this.db
      .from('lesson_students')
      .select('students(id, name, code)')
      .eq('lesson_id', lessonId);
    if (error) throw dbError(error);
    return data.map((r) => r.students);
  }

  async reports(lessonId: string): Promise<AssetReportRow[]> {
    const { data, error } = await this.db
      .from('lesson_reports')
      .select('id, student_id, pdf_status, sent_at, status')
      .eq('lesson_id', lessonId);
    if (error) throw dbError(error);
    return data;
  }

  /** Every recording of the lesson but a removed one, newest first. */
  async recordings(lessonId: string): Promise<AssetRecordingRow[]> {
    const { data, error } = await this.db
      .from('lesson_recordings')
      .select('*')
      .eq('lesson_id', lessonId)
      .neq('status', 'deleted')
      .order('started_at', { ascending: false });
    if (error) throw dbError(error);
    return data;
  }
}
