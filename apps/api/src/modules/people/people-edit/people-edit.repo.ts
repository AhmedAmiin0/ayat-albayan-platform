import type { Tables } from '@ab/db';
import { Inject, Injectable } from '@nestjs/common';
import { DB, type Db } from '@/common/db/db.module';
import { dbError } from '@/common/http/http';

export type StudentRow = Tables<'students'>;
export type GuardianRow = Tables<'guardians'>;

const VIEW = [
  'id, code, name, age, gender, level, memorized, goal, riwaya, tz, notes, teacher_gender_pref',
  'contact_is_self, profile_id, guardian:guardians(id, name, phone_e164, country, tz, notes, profile_id',
  'phones:guardian_phones(phone_e164, is_primary), students(id, code, name, contact_is_self))',
].join(', ');

type Fields = Pick<
  StudentRow,
  'id' | 'code' | 'name' | 'age' | 'gender' | 'level' | 'memorized' | 'goal' | 'riwaya'
>;
type Sibling = Pick<StudentRow, 'id' | 'code' | 'name' | 'contact_is_self'>;
type FamilyNumber = Pick<Tables<'guardian_phones'>, 'phone_e164' | 'is_primary'>;
type Family = Pick<
  GuardianRow,
  'id' | 'name' | 'phone_e164' | 'country' | 'tz' | 'notes' | 'profile_id'
> & {
  phones: FamilyNumber[];
  students: Sibling[];
};
type Extra = 'tz' | 'notes' | 'teacher_gender_pref' | 'contact_is_self' | 'profile_id';
export type ViewRow = Fields & Pick<StudentRow, Extra> & { guardian: Family | null };
type Child = Pick<StudentRow, 'id' | 'code' | 'name' | 'contact_is_self' | 'brought_by'>;

/** A family move: written only while the student is still in `from` (compare-and-set). */
interface MoveRow {
  id: string;
  from: string;
  to: string;
}

/** The single rows the assistant's people edits read and write (owner 2026-11-02). */
@Injectable()
export class PeopleEditRepo {
  constructor(@Inject(DB) private readonly db: Db) {}

  async view(id: string): Promise<ViewRow | null> {
    const query = this.db.from('students').select(VIEW).eq('id', id);
    const { data, error } = await query.maybeSingle<ViewRow>();
    if (error) throw dbError(error);
    return data;
  }

  async student(id: string): Promise<StudentRow | null> {
    const { data, error } = await this.db.from('students').select('*').eq('id', id).maybeSingle();
    if (error) throw dbError(error);
    return data;
  }

  async guardian(id: string): Promise<GuardianRow | null> {
    const { data, error } = await this.db.from('guardians').select('*').eq('id', id).maybeSingle();
    if (error) throw dbError(error);
    return data;
  }

  /** The family's children: duplicate names and «الطالب هو ولي الأمر». */
  async children(guardianId: string): Promise<Child[]> {
    const { data, error } = await this.db
      .from('students')
      .select('id, code, name, contact_is_self, brought_by')
      .eq('guardian_id', guardianId)
      .order('created_at');
    if (error) throw dbError(error);
    return data;
  }

  /** Whether any child of the family has a login of its own (its codes go to the family). */
  async childHasLogin(guardianId: string): Promise<boolean> {
    const { count, error } = await this.db
      .from('students')
      .select('id', { count: 'exact', head: true })
      .eq('guardian_id', guardianId)
      .not('profile_id', 'is', null);
    if (error) throw dbError(error);
    return (count ?? 0) > 0;
  }

  /** contact_is_self is cleared. null = moved meanwhile (or gone): nothing written. */
  async move(row: MoveRow): Promise<StudentRow | null> {
    const { data, error } = await this.db
      .from('students')
      .update({ guardian_id: row.to, contact_is_self: false })
      .eq('id', row.id)
      .eq('guardian_id', row.from)
      .select()
      .maybeSingle();
    if (error) throw dbError(error);
    return data;
  }

  async setSelf(id: string, value: boolean): Promise<StudentRow | null> {
    const query = this.db.from('students').update({ contact_is_self: value }).eq('id', id);
    const { data, error } = await query.select().maybeSingle();
    if (error) throw dbError(error);
    return data;
  }

  async renameGuardian(id: string, name: string): Promise<GuardianRow> {
    const query = this.db.from('guardians').update({ name }).eq('id', id);
    const { data, error } = await query.select().single();
    if (error) throw dbError(error);
    return data;
  }
}
