import { Inject, Injectable } from '@nestjs/common';
import { DB, type Db } from '../../../../common/db/db.module';
import { TeacherMeQueries } from '../../../teaching/lessons/teacher-me/teacher-me.queries';
import { dbError } from '../../../../common/http/http';
import type { PeopleStudentRow } from '../people/thread-people.mapper';

export interface ScopeTeacher {
  id: string;
  display_name_ar: string;
  phone_e164: string | null;
}

/**
 * Teacher mode reads (R-TCH-03, R-MSG-05, migration 164). Service role: the scope functions are
 * not executable by `authenticated`; TeacherScopes and the services guard every call.
 */
@Injectable()
export class TeacherThreadsQueries {
  constructor(
    @Inject(DB) private readonly db: Db,
    private readonly me: TeacherMeQueries,
  ) {}

  /** The signed-in teacher's row (JWT sub = teachers.profile_id); null when not linked. */
  async teacher(profileId: string): Promise<ScopeTeacher | null> {
    const { data, error } = await this.db
      .from('teachers')
      .select('id, display_name_ar, phone_e164')
      .eq('profile_id', profileId)
      .maybeSingle();
    if (error) throw dbError(error);
    return data;
  }

  /** teacher_thread_phones: their subscribed students' guardians (never new / trial / pending_subscription; assigned or taught ≤ 90 days) + their own. */
  async phones(teacherId: string): Promise<string[]> {
    const { data, error } = await this.db.rpc('teacher_thread_phones', { p_teacher_id: teacherId });
    if (error) throw dbError(error);
    return data.map((r) => r.phone_e164);
  }

  /** The teacher's own unread per phone (teacher_unread); never the admin's read_at. */
  async unread(teacherId: string, phones: readonly string[]): Promise<Map<string, number>> {
    if (phones.length === 0) return new Map();
    const { data, error } = await this.db.rpc('teacher_unread', { p_teacher_id: teacherId, p_phones: [...phones] });
    if (error) throw dbError(error);
    return new Map(data.map((r) => [r.phone_e164, r.unread]));
  }

  /** Opening a thread marks it read for this teacher only (the admin's unread stays). */
  async stampRead(input: { teacherId: string; phone: string; at: Date }): Promise<void> {
    const row = { teacher_id: input.teacherId, phone_e164: input.phone, read_at: input.at.toISOString() };
    const { error } = await this.db.from('teacher_thread_reads').upsert(row, { onConflict: 'teacher_id,phone_e164' });
    if (error) throw dbError(error);
  }

  /** Ids of the teacher's own students (TeacherMeQueries.students: assigned + active rules). */
  async myStudentIds(teacherId: string): Promise<Set<string>> {
    return new Set((await this.me.students(teacherId)).map((s) => s.id));
  }

  /** The guardian's students, oldest first, without packages (no money in teacher mode). */
  async guardianStudents(guardianId: string): Promise<PeopleStudentRow[]> {
    const { data, error } = await this.db
      .from('students')
      .select('id, code, name, status, teacher:teachers(display_name_ar)')
      .eq('guardian_id', guardianId)
      .order('created_at');
    if (error) throw dbError(error);
    return data;
  }
}
