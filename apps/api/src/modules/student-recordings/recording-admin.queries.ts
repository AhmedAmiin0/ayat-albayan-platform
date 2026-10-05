import { Inject, Injectable } from '@nestjs/common';
import { DB, type Db } from '../../common/db/db.module';
import type { RecordingRow } from '../classroom/recording.queries';
import { dbError } from '../teachers/http';

/** One recording with the teacher of its lesson (null for a meeting's recording). */
export type RecordingWithTeacher = RecordingRow & { lessons: { teacher_id: string } | null };

/** Single-row reads and writes of the visibility toggle, the admin delete and the retention job. */
@Injectable()
export class RecordingAdminQueries {
  constructor(@Inject(DB) private readonly db: Db) {}

  async byId(id: string): Promise<RecordingWithTeacher | null> {
    const { data, error } = await this.db.from('lesson_recordings').select('*, lessons(teacher_id)').eq('id', id).maybeSingle();
    if (error) throw dbError(error);
    return data;
  }

  async setVisible(id: string, visible: boolean): Promise<void> {
    const { error } = await this.db.from('lesson_recordings').update({ visible_to_student: visible }).eq('id', id);
    if (error) throw dbError(error);
  }

  /** The file is already gone: the row stays as a record, hidden from students. A deleted row never changes again. */
  async markDeleted(id: string, at: string): Promise<void> {
    const { error } = await this.db
      .from('lesson_recordings')
      .update({ status: 'deleted', deleted_at: at, visible_to_student: false })
      .eq('id', id)
      .neq('status', 'deleted')
      .neq('status', 'recording');
    if (error) throw dbError(error);
  }
}
