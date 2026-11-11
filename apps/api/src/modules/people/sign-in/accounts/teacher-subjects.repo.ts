import type { Db } from '@/common/db/db.module';
import { dbError } from '@/common/http/http';
import type { ProfileRec, TeacherRec } from '@/modules/people/sign-in/sign-in.ports';

// The teacher side of SubjectStore (docs/46 A2): active teachers only, by the phone of her login
// (role teacher) first, else by the record's phone. NOT staffByPhone: that one returns any staff
// role and stops at a guardian login holding the number.

const TEACHER =
  'id, display_name_ar, tz, phone_e164, profile_id, login:profiles!teachers_profile_id_fkey(id, role, disabled_at, phone_e164)';

interface LoginRow {
  id: string;
  role: ProfileRec['role'];
  disabled_at: string | null;
  phone_e164: string | null;
}

interface TeacherRow {
  id: string;
  display_name_ar: string;
  tz: string;
  phone_e164: string | null;
  profile_id: string | null;
  login: LoginRow | null;
}

const toLogin = (r: LoginRow): ProfileRec => ({
  id: r.id,
  role: r.role,
  disabled: r.disabled_at !== null,
  phone: r.phone_e164,
});

const toTeacher = (r: TeacherRow): TeacherRec => ({
  id: r.id,
  name: r.display_name_ar,
  tz: r.tz,
  recordPhone: r.phone_e164,
  profileId: r.profile_id,
  login: r.login ? toLogin(r.login) : null,
});

async function activeTeacher(
  db: Db,
  match: { column: 'profile_id' | 'phone_e164'; value: string },
): Promise<TeacherRec | null> {
  const { data, error } = await db
    .from('teachers')
    .select(TEACHER)
    .eq(match.column, match.value)
    .eq('status', 'active')
    .maybeSingle();
  if (error) throw dbError(error);
  return data ? toTeacher(data) : null;
}

/** The teacher this phone names: her own login's number wins over another record's. */
export async function teacherByPhone(db: Db, phone: string): Promise<TeacherRec | null> {
  const { data, error } = await db
    .from('profiles')
    .select('id')
    .eq('phone_e164', phone)
    .eq('role', 'teacher')
    .maybeSingle();
  if (error) throw dbError(error);
  const byLogin = data ? await activeTeacher(db, { column: 'profile_id', value: data.id }) : null;
  return byLogin ?? activeTeacher(db, { column: 'phone_e164', value: phone });
}
