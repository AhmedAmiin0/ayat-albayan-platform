import { Inject, Injectable } from '@nestjs/common';
import { DB, type Db } from '@/common/db/db.module';
import type { QueuedMessage } from '@/modules/messaging/reminders/queued-row';
import { queueMessages } from '@/modules/messaging/reminders/reminders.repo';
import { sendableTemplates } from '@/modules/messaging/whatsapp';
import { dbError } from '@/common/http/http';
import { BookingSettings } from '@/modules/teaching/booking/booking.settings';
import type { AlertLesson } from './teacher-alert.plan';

/** The templates the alert can go as: teacher_lesson_v3 first (owner 2026-11-06), else its own. */
const ALERT_KEYS: readonly string[] = ['teacher_new_student', 'teacher_lesson_v3'];

/** An alert lesson with its teacher's meeting_mode (teacher_lesson_v3's room). */
export type AlertLessonRow = AlertLesson & { teacher: { meeting_mode: string | null } | null };

/** Reads and the idempotent queue write of the teacher's new-student alert (R-NOT-03). */
@Injectable()
export class TeacherAlertRepo {
  constructor(
    @Inject(DB) private readonly db: Db,
    private readonly settings: BookingSettings,
  ) {}

  async lessons(ids: readonly string[]): Promise<AlertLessonRow[]> {
    const { data, error } = await this.db
      .from('lessons')
      .select('id, starts_at, ends_at, meeting_link, teacher:teachers(id, profile_id, phone_e164, tz, display_name_ar, status, meeting_mode, profile:profiles!teachers_profile_id_fkey(disabled_at))')
      .in('id', [...ids]);
    if (error) throw dbError(error);
    return data;
  }

  async students(ids: readonly string[]): Promise<{ id: string; name: string; code: string | null }[]> {
    if (ids.length === 0) return [];
    const { data, error } = await this.db.from('students').select('id, name, code').in('id', [...ids]);
    if (error) throw dbError(error);
    // The booking's order (the wizard's), not the database's.
    return ids.flatMap((id) => data.filter((s) => s.id === id).map((s) => ({ id: s.id, name: s.name ?? '', code: s.code })));
  }

  /**
   * Which of teacher_new_student / teacher_lesson_v3 are sendable: approved, or (the former on a
   * crm line) its CRM template teacher_lesson_v2 is (template-gate.repo.ts, as the sender).
   */
  async sendable(): Promise<Set<string>> {
    const rows = await sendableTemplates(this.db);
    return new Set(rows.map((t) => t.key).filter((k) => ALERT_KEYS.includes(k)));
  }

  /** settings.meeting_link_auto: the default of a teacher whose meeting_mode is null. */
  async academyAuto(): Promise<boolean> {
    return (await this.settings.read()).meeting_link_auto;
  }

  queue(rows: readonly QueuedMessage[]): Promise<number> {
    return queueMessages(this.db, rows);
  }
}
