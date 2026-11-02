import type { TablesInsert } from '@ab/db';
import { Inject, Injectable } from '@nestjs/common';
import type { PostgrestError } from '@supabase/supabase-js';
import { DB, type Db } from '@/common/db/db.module';
import { conflict } from '@/common/http/errors';
import { dbError } from '@/common/http/http';
import type { StudentRow } from './people-edit.repo';

type Count = PromiseLike<{ count: number | null; error: PostgrestError | null }>;
const head = { count: 'exact', head: true } as const;

/**
 * Everything that makes a student row a learner with a history: lessons, packages, money, reports,
 * chat messages, attendance and assistants. «تحويل إلى ولي أمر» is refused while any of these holds
 * a row. The cascading ones (student_assistants, the channel's messages) are checked here because a
 * delete would take them along; the others are also protected by their foreign keys (23503).
 */
const RECORDS: Record<string, (db: Db, id: string) => Count> = {
  subscriptions: (db, id) => db.from('subscriptions').select('id', head).eq('student_id', id),
  lesson_students: (db, id) =>
    db.from('lesson_students').select('lesson_id', head).eq('student_id', id),
  makeup_lessons: (db, id) => db.from('lessons').select('id', head).eq('makeup_student_id', id),
  schedule_rule_students: (db, id) =>
    db.from('schedule_rule_students').select('rule_id', head).eq('student_id', id),
  lesson_reports: (db, id) => db.from('lesson_reports').select('id', head).eq('student_id', id),
  lesson_feedback: (db, id) => db.from('lesson_feedback').select('id', head).eq('student_id', id),
  payment_links: (db, id) => db.from('payment_links').select('id', head).eq('student_id', id),
  assistant_commissions: (db, id) =>
    db.from('assistant_commissions').select('id', head).eq('student_id', id),
  course_pauses: (db, id) => db.from('course_pauses').select('id', head).eq('student_id', id),
  student_assistants: (db, id) =>
    db.from('student_assistants').select('profile_id', head).eq('student_id', id),
  channel_messages: (db, id) =>
    db
      .from('channel_messages')
      .select('id, channel:student_channels!inner(student_id)', head)
      .eq('channel.student_id', id),
};

/** The history checks, a conversion's new row and the delete of an empty, mis-registered one. */
@Injectable()
export class StudentRecordsRepo {
  constructor(@Inject(DB) private readonly db: Db) {}

  /** The tables holding rows of this student (empty = a row with no history at all). */
  async records(studentId: string): Promise<string[]> {
    const entries = Object.entries(RECORDS);
    const counts = await Promise.all(entries.map(([, count]) => count(this.db, studentId)));
    const failed = counts.find((c) => c.error);
    if (failed?.error) throw dbError(failed.error);
    return entries.filter((_, i) => (counts[i]?.count ?? 0) > 0).map(([table]) => table);
  }

  async insert(row: TablesInsert<'students'>): Promise<StudentRow> {
    const { data, error } = await this.db.from('students').insert(row).select().single();
    if (error) throw dbError(error);
    return data;
  }

  /** null = gone or given a login meanwhile; 409 student_has_records when a row appeared. */
  async removeEmpty(id: string): Promise<StudentRow | null> {
    const query = this.db.from('students').delete().eq('id', id).is('profile_id', null);
    const { data, error } = await query.select();
    if (error?.code === '23503') throw conflict('student_has_records');
    if (error) throw dbError(error);
    return data[0] ?? null;
  }
}
