import { NOT_SUBSCRIBED_STATUSES } from '@ab/shared';
import { Inject, Injectable } from '@nestjs/common';
import { DB, type Db } from '../../../../../common/db/db.module';
import { orSafe } from '../../../../people/guardians/http';
import { studentNameOrCodeFilter } from '../../../../people/students/students.mapper';
import { dbError } from '../../../../../common/http/http';

/** Who may be invited as staff (base roles; never a guardian or a student login). */
const STAFF_ROLES = ['admin', 'teacher', 'assistant', 'sales'] as const;
const PICK_LIMIT = 20;
/** «لم يشترك بعد» (new, trial, pending_subscription; owner 2026-10-15) as a PostgREST in-list. */
const NOT_SUBSCRIBED = `(${NOT_SUBSCRIBED_STATUSES.join(',')})`;

/**
 * The students a login may already see, so may invite (R-MEET-02): admin and sales every student
 * (sales: the /sales/students/all scope), a teacher their own subscribed ones, never new / trial /
 * pending_subscription (owner 2026-10-11, 2026-10-15; like teacher_thread_phones: sales manages a family
 * not subscribed yet), an assistant the ones assigned to them.
 */
export type StudentScope = { kind: 'all' } | { kind: 'ids'; ids: readonly string[] };

interface StaffPick {
  id: string;
  full_name: string;
  role: string;
  tz: string;
}

interface StudentPick {
  id: string;
  name: string;
  code: string | null;
  guardian: { id: string; name: string; phone_e164: string; tz: string } | null;
}

const STUDENT_COLUMNS = 'id, name, code, guardian:guardians(id, name, phone_e164, tz)';

/** Reads behind the invitee picker and the invitee resolution (service role; the services guard). */
@Injectable()
export class MeetingInviteeQueries {
  constructor(@Inject(DB) private readonly db: Db) {}

  /** Enabled staff profiles, by id (resolution) or by name (picker). */
  async staff(input: { ids?: readonly string[]; q?: string }): Promise<StaffPick[]> {
    let query = this.db.from('profiles').select('id, full_name, role, tz').in('role', [...STAFF_ROLES]).is('disabled_at', null);
    if (input.ids) query = query.in('id', [...input.ids]);
    const name = input.q ? orSafe(input.q) : '';
    if (name) query = query.ilike('full_name', `%${name}%`);
    const { data, error } = await query.order('full_name').limit(input.ids ? input.ids.length : PICK_LIMIT);
    if (error) throw dbError(error);
    return data;
  }

  /** Students in the scope, by id (resolution, with the guardian) or by name / code (picker). */
  async students(input: { scope: StudentScope; ids?: readonly string[]; q?: string }): Promise<StudentPick[]> {
    let query = this.db.from('students').select(STUDENT_COLUMNS);
    if (input.scope.kind === 'ids') query = query.in('id', [...input.scope.ids]);
    if (input.ids) query = query.in('id', [...input.ids]);
    const filter = input.q ? studentNameOrCodeFilter(input.q) : null;
    if (filter) query = query.or(filter);
    const { data, error } = await query.order('name').limit(input.ids ? input.ids.length : PICK_LIMIT);
    if (error) throw dbError(error);
    return data;
  }

  /** A teacher's own subscribed students' ids, never the not-subscribed ones (students.teacher_id → teachers.profile_id; migration 20261015000441). */
  async teacherStudentIds(profileId: string): Promise<string[]> {
    const { data: teacher, error } = await this.db.from('teachers').select('id').eq('profile_id', profileId).maybeSingle();
    if (error) throw dbError(error);
    if (!teacher) return [];
    const { data, error: e2 } = await this.db.from('students').select('id').eq('teacher_id', teacher.id).not('status', 'in', NOT_SUBSCRIBED);
    if (e2) throw dbError(e2);
    return data.map((r) => r.id);
  }

  /** The students an assistant is assigned to (student_assistants). */
  async assistantStudentIds(profileId: string): Promise<string[]> {
    const { data, error } = await this.db.from('student_assistants').select('student_id').eq('profile_id', profileId);
    if (error) throw dbError(error);
    return data.map((r) => r.student_id);
  }

  /** A guardian known by this phone (their name and tz for a typed number), or null. */
  async guardianByPhone(phone: string): Promise<{ id: string; name: string; tz: string } | null> {
    const { data, error } = await this.db.from('guardians').select('id, name, tz').eq('phone_e164', phone).maybeSingle();
    if (error) throw dbError(error);
    return data;
  }

  /** The creator's tz: the time of an invitation to an unknown number reads in it. */
  async profileTz(profileId: string): Promise<string | null> {
    const { data, error } = await this.db.from('profiles').select('tz').eq('id', profileId).maybeSingle();
    if (error) throw dbError(error);
    return data?.tz ?? null;
  }
}
