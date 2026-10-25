import { Inject, Injectable } from '@nestjs/common';
import { DB, type Db } from '../../common/db/db.module';
import type { QueuedMessage } from '../reminders/queued-row';
import { approvedTemplates, queueMessages } from '../reminders/reminders.queries';
import { dbError } from '../teachers/http';
import type { AlertLesson } from './teacher-alert.plan';

/** Reads and the idempotent queue write of the teacher's new-student alert (R-NOT-03). */
@Injectable()
export class TeacherAlertQueries {
  constructor(@Inject(DB) private readonly db: Db) {}

  async lessons(ids: readonly string[]): Promise<AlertLesson[]> {
    const { data, error } = await this.db
      .from('lessons')
      .select('id, starts_at, teacher:teachers(id, profile_id, phone_e164, tz, status, profile:profiles!teachers_profile_id_fkey(disabled_at))')
      .in('id', [...ids]);
    if (error) throw dbError(error);
    return data;
  }

  async students(ids: readonly string[]): Promise<{ id: string; name: string }[]> {
    if (ids.length === 0) return [];
    const { data, error } = await this.db.from('students').select('id, name').in('id', [...ids]);
    if (error) throw dbError(error);
    // The booking's order (the wizard's), not the database's.
    return ids.flatMap((id) => data.filter((s) => s.id === id).map((s) => ({ id: s.id, name: s.name ?? '' })));
  }

  async approved(): Promise<boolean> {
    return (await approvedTemplates(this.db, ['teacher_new_student'])).has('teacher_new_student');
  }

  queue(rows: readonly QueuedMessage[]): Promise<number> {
    return queueMessages(this.db, rows);
  }
}
