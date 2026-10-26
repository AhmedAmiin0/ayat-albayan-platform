import { Inject, Injectable } from '@nestjs/common';
import { DB, type Db } from '../../../../common/db/db.module';
import { dbError } from '../../../../common/http/http';
import { conflict } from '../../../../common/http/errors';
import { isStaff, type GuardianRec, type NewProfile, type ProfileRec, type StudentRec, type SubjectStore } from '../sign-in.ports';

const PROFILE = 'id, role, disabled_at, phone_e164, teacher:teachers(phone_e164)';

interface ProfileRow {
  id: string;
  role: ProfileRec['role'];
  disabled_at: string | null;
  phone_e164: string | null;
  teacher: { phone_e164: string | null }[] | { phone_e164: string | null } | null;
}

function toProfile(r: ProfileRow): ProfileRec {
  const teacher = Array.isArray(r.teacher) ? r.teacher[0] : r.teacher;
  return { id: r.id, role: r.role, disabled: r.disabled_at !== null, phone: r.phone_e164 ?? teacher?.phone_e164 ?? null };
}

/** SubjectStore on the service-role client: who a phone, a student code or a username names. */
@Injectable()
export class SubjectsQueries implements SubjectStore {
  constructor(@Inject(DB) private readonly db: Db) {}

  async guardianByPhone(phone: string): Promise<GuardianRec | null> {
    const { data, error } = await this.db.from('guardians').select('id, name, phone_e164, tz, profile_id').eq('phone_e164', phone).maybeSingle();
    if (error) throw dbError(error);
    return data ? { id: data.id, name: data.name, phone: data.phone_e164, tz: data.tz, profileId: data.profile_id } : null;
  }

  async studentByCode(code: string): Promise<StudentRec | null> {
    const { data, error } = await this.db
      .from('students')
      .select('id, name, tz, profile_id, guardian:guardians!inner(phone_e164)')
      .eq('code', code)
      .maybeSingle();
    if (error) throw dbError(error);
    if (!data) return null;
    return { id: data.id, name: data.name, tz: data.tz, profileId: data.profile_id, guardianPhone: data.guardian.phone_e164 };
  }

  profileById(id: string): Promise<ProfileRec | null> {
    return this.oneProfile('id', id);
  }

  profileByUsername(username: string): Promise<ProfileRec | null> {
    return this.oneProfile('username', username);
  }

  profileByPhone(phone: string): Promise<ProfileRec | null> {
    return this.oneProfile('phone_e164', phone);
  }

  async staffByPhone(phone: string): Promise<ProfileRec | null> {
    const own = await this.profileByPhone(phone);
    if (own) return isStaff(own.role) ? own : null;
    const { data, error } = await this.db.from('teachers').select('profile_id').eq('phone_e164', phone).not('profile_id', 'is', null).maybeSingle();
    if (error) throw dbError(error);
    return data?.profile_id ? this.profileById(data.profile_id) : null;
  }

  async insertProfile(row: NewProfile): Promise<void> {
    const { data: role } = await this.db.from('roles').select('id').eq('is_system', true).eq('key', row.role).maybeSingle();
    const { error } = await this.db.from('profiles').insert({
      id: row.id,
      role: row.role,
      role_id: role?.id ?? null,
      full_name: row.fullName,
      phone_e164: row.phone,
      tz: row.tz,
    });
    if (error?.code === '23505') throw conflict('phone_belongs_to_staff');
    if (error) throw dbError(error);
  }

  async link(input: { kind: 'guardian' | 'student'; recordId: string; profileId: string }): Promise<boolean> {
    const table = input.kind === 'guardian' ? 'guardians' : 'students';
    const { data, error } = await this.db
      .from(table)
      .update({ profile_id: input.profileId })
      .eq('id', input.recordId)
      .is('profile_id', null)
      .select('id');
    if (error) throw dbError(error);
    return data.length === 1;
  }

  private async oneProfile(column: 'id' | 'username' | 'phone_e164', value: string): Promise<ProfileRec | null> {
    const { data, error } = await this.db.from('profiles').select(PROFILE).eq(column, value).maybeSingle();
    if (error) throw dbError(error);
    return data ? toProfile(data) : null;
  }
}
