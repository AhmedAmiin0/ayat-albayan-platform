import { Inject, Injectable } from '@nestjs/common';
import { DB, type Db } from '@/common/db/db.module';
import type { RecordingRow } from '@/modules/teaching/classroom/recordings/recording.repo';
import { done, maybe, pgError, rows } from '@/common/db/errors';

/** One recording with the teacher of its lesson (null for a meeting's recording). */
export type RecordingWithTeacher = RecordingRow & { lessons: { teacher_id: string } | null };

/** Single-row reads and writes of the visibility toggle, the admin delete and the retention job. */
@Injectable()
export class RecordingAdminRepo {
  constructor(@Inject(DB) private readonly db: Db) {}

  async byId(id: string): Promise<RecordingWithTeacher | null> {
    const data = maybe(await this.db.from('lesson_recordings').select('*, lessons(teacher_id)').eq('id', id).maybeSingle());
    return data;
  }

  /** How many students attend the lesson (a recording of more than one is a group file). */
  async attendeeCount(lessonId: string): Promise<number> {
    const { count, error } = await this.db.from('lesson_students').select('lesson_id', { count: 'exact', head: true }).eq('lesson_id', lessonId);
    if (error) throw pgError(error);
    return count ?? 0;
  }

  async setVisible(id: string, visible: boolean): Promise<void> {
    done(await this.db.from('lesson_recordings').update({ visible_to_student: visible }).eq('id', id));
  }

  /** The file is already gone: the row stays as a record, hidden from students. A deleted row never changes again; returns how many rows changed (0 = someone else got there first). */
  async markDeleted(id: string, at: string): Promise<number> {
    const data = rows(await this.db
      .from('lesson_recordings')
      .update({ status: 'deleted', deleted_at: at, visible_to_student: false })
      .eq('id', id)
      .neq('status', 'deleted')
      .neq('status', 'recording')
      .select('id'));
    return data.length;
  }
}
