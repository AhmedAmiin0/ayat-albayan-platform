import { Inject, Injectable } from '@nestjs/common';
import { DB, type Db } from '@/common/db/db.module';
import { dbError } from '@/common/http/http';
import {
  approvedTemplates,
  queueMessages,
  type QueuedMessage,
} from '@/modules/messaging/reminders';
import type { NoticeLessonRow, TakenLessonRow } from './notice.build';
import type { NoticeKey, NoticeStudent } from './notice.types';

const LESSON_SELECT =
  'id, starts_at, teacher:teachers(id, profile_id, phone_e164, tz, display_name_ar, status, profile:profiles!teachers_profile_id_fkey(disabled_at)), lesson_students(student:students(id, name, tz, profile_id, guardian:guardians(id, name, phone_e164, tz, profile_id)))' as const;
const TAKEN_SELECT =
  'id, starts_at, teacher:teachers(id, profile_id, phone_e164, tz, display_name_ar, status, profile:profiles!teachers_profile_id_fkey(disabled_at))' as const;
const NEXT_SELECT =
  'id, starts_at, teacher:teachers(id, profile_id, phone_e164, tz, display_name_ar, status, profile:profiles!teachers_profile_id_fkey(disabled_at)), lesson_students!inner(student_id)' as const;
const STUDENT_SELECT =
  'id, name, tz, profile_id, guardian:guardians(id, name, phone_e164, tz, profile_id)' as const;

/** Reads and the idempotent queue write of the schedule-change notices (owner 2026-10-30). */
@Injectable()
export class ScheduleNoticesRepo {
  constructor(@Inject(DB) private readonly db: Db) {}

  /** The lesson with its teacher and every student on it (and their guardian). */
  async lesson(id: string): Promise<NoticeLessonRow | null> {
    const { data, error } = await this.db
      .from('lessons')
      .select(LESSON_SELECT)
      .eq('id', id)
      .maybeSingle();
    if (error) throw dbError(error);
    return data;
  }

  async student(id: string): Promise<NoticeStudent | null> {
    const { data, error } = await this.db
      .from('students')
      .select(STUDENT_SELECT)
      .eq('id', id)
      .maybeSingle();
    if (error) throw dbError(error);
    return data;
  }

  /** The lessons a pause took (cancelled, or left in a group), with their teachers. */
  async lessons(ids: readonly string[]): Promise<TakenLessonRow[]> {
    if (ids.length === 0) return [];
    const { data, error } = await this.db.from('lessons').select(TAKEN_SELECT).in('id', [...ids]);
    if (error) throw dbError(error);
    return data;
  }

  /** The student's first open lesson after `after`: the first lesson back after a resume. */
  async nextLesson(studentId: string, after: Date): Promise<TakenLessonRow | null> {
    const { data, error } = await this.db
      .from('lessons')
      .select(NEXT_SELECT)
      .eq('lesson_students.student_id', studentId)
      .in('status', ['scheduled', 'confirmed'])
      .gt('starts_at', after.toISOString())
      .order('starts_at')
      .limit(1);
    if (error) throw dbError(error);
    const [next] = data;
    return next ? { id: next.id, starts_at: next.starts_at, teacher: next.teacher } : null;
  }

  /** The template gate: queued only once the CRM / Meta approved it (as every producer). */
  async approved(key: NoticeKey): Promise<boolean> {
    return (await approvedTemplates(this.db, [key])).has(key);
  }

  /** insert … on conflict (dedup_key) do nothing: how many rows were new. */
  queue(rows: readonly QueuedMessage[]): Promise<number> {
    return queueMessages(this.db, rows);
  }
}
