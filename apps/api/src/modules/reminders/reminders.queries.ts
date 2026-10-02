import type { PushKind, TemplateKey } from '@ab/shared';
import { Inject, Injectable } from '@nestjs/common';
import { DB, type Db } from '../../common/db/db.module';
import { readAll } from '../scheduling/read-all';
import { dbError } from '../teachers/http';
import type { QueuedMessage } from './queued-row';
import { REMINDER_LESSON_STATUSES, type ReminderLesson } from './reminders.plan';

const LESSON_SELECT =
  'id, starts_at, status, meeting_link, teacher:teachers(id, display_name_ar, phone_e164, tz), lesson_students(student:students(name, guardian:guardians(id, phone_e164, tz)))' as const;

/** Every key the reminder job queues: its rows for a lesson that was cancelled are dropped. */
export const REMINDER_KEYS = [
  'lesson_reminder',
  'lesson_reminder_meet',
  'lesson_reminder_plain',
  'lesson_reminder_24h',
  'teacher_lesson_reminder',
  'teacher_lesson_reminder_meet',
] as const satisfies readonly TemplateKey[];

/** Registry keys among `keys` that Meta approved (message_templates.status). */
export async function approvedTemplates(db: Db, keys: readonly TemplateKey[]): Promise<Set<string>> {
  const { data, error } = await db.from('message_templates').select('key').in('key', [...keys]).eq('status', 'approved');
  if (error) throw dbError(error);
  return new Set(data.map((r) => r.key));
}

/** insert … on conflict (dedup_key) do nothing (rule 8); returns how many rows were new. */
export async function queueMessages(db: Db, rows: readonly QueuedMessage[]): Promise<number> {
  if (rows.length === 0) return 0;
  const { data, error } = await db
    .from('messages')
    .upsert([...rows], { onConflict: 'dedup_key', ignoreDuplicates: true })
    .select('id');
  if (error) throw dbError(error);
  return data.length;
}

/** Reads and idempotent writes of the reminder job (R-MSG-02, docs/12 §7). */
@Injectable()
export class RemindersQueries {
  constructor(@Inject(DB) private readonly db: Db) {}

  /** scheduled | confirmed lessons starting in (now, until], with teacher, students, guardians. */
  async upcoming(range: { now: Date; until: Date }): Promise<ReminderLesson[]> {
    const rows = await readAll((from, to) =>
      this.db
        .from('lessons')
        .select(LESSON_SELECT)
        .in('status', [...REMINDER_LESSON_STATUSES])
        .gt('starts_at', range.now.toISOString())
        .lte('starts_at', range.until.toISOString())
        .order('starts_at')
        .order('id')
        .range(from, to),
    );
    return rows.map(({ lesson_students, ...lesson }) => ({
      ...lesson,
      students: lesson_students.flatMap((ls) => (ls.student ? [ls.student] : [])),
    }));
  }

  approved(keys: readonly TemplateKey[]): Promise<Set<string>> {
    return approvedTemplates(this.db, keys);
  }

  queue(rows: readonly QueuedMessage[]): Promise<number> {
    return queueMessages(this.db, rows);
  }

  /**
   * «Never for cancelled lessons» also covers a reminder queued before the lesson was cancelled
   * or moved (the sender only checks expiry): still-queued reminder rows whose lesson left
   * scheduled | confirmed are deleted — never sent, and an un-cancel can queue them again.
   * Only unexpired rows (the next 25 h), so rows piling up while the send gate is closed don't
   * grow the read. ponytail: a row the sender claimed this very second may still go out.
   */
  async dropCancelled(now: Date): Promise<number> {
    const { data, error } = await this.db
      .from('messages')
      .select('id, lesson:lessons(status)')
      .eq('direction', 'outbound')
      .eq('status', 'queued')
      .in('template_key', [...REMINDER_KEYS])
      .gt('expires_at', now.toISOString())
      .not('lesson_id', 'is', null);
    if (error) throw dbError(error);
    const open: readonly string[] = REMINDER_LESSON_STATUSES;
    const ids = data.filter((m) => !m.lesson || !open.includes(m.lesson.status)).map((m) => m.id);
    if (ids.length === 0) return 0;
    const del = await this.db.from('messages').delete().in('id', ids).eq('status', 'queued').select('id');
    if (del.error) throw dbError(del.error);
    return del.data.length;
  }

  /**
   * Subjects already pushed as `kind` since `since`, read back from push_notifications.dedup_key
   * (`{kind}:{subject}:{profile_id}`), so a tick skips them instead of re-upserting per admin.
   */
  async pushedSubjects(kind: PushKind, since: Date): Promise<Set<string>> {
    const rows = await readAll((from, to) =>
      this.db
        .from('push_notifications')
        .select('dedup_key, profile_id')
        .eq('kind', kind)
        .gte('created_at', since.toISOString())
        .order('id')
        .range(from, to),
    );
    return new Set(rows.map((r) => r.dedup_key.slice(kind.length + 1, -(r.profile_id.length + 1))));
  }
}
