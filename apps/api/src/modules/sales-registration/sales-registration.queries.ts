import { REGISTRATION_CHECK_MAX, type RegistrationMatch } from '@ab/shared';
import { Inject, Injectable } from '@nestjs/common';
import { DB, type Db } from '../../common/db/db.module';
import { studentNameOrCodeFilter } from '../students/students.mapper';
import { dbError } from '../teachers/http';

/** One more row than the answer lists, so `more` can be told without a count. */
const READ = REGISTRATION_CHECK_MAX + 1;
const COLUMNS = 'name, code, status, teacher:teachers(display_name_ar)';

type Row = Pick<RegistrationMatch, 'name' | 'status'> & { code: string | null; teacher: { display_name_ar: string } | null };

/** Whitelist: the four keys of the answer, whatever else a row carries (the join's phone never leaves). */
export const toMatch = (r: Row): RegistrationMatch => ({ name: r.name, code: r.code ?? '', status: r.status, teacher_name: r.teacher?.display_name_ar ?? null });

/**
 * «التحقق من التسجيل» (docs/16 row 23), read with the service role: every status (new, trial, active, expired,
 * pending_renewal, churned, …), ordered by name, at most REGISTRATION_CHECK_MAX + 1 rows.
 */
@Injectable()
export class SalesRegistrationQueries {
  constructor(@Inject(DB) private readonly db: Db) {}

  /** The children of the guardian with this phone (guardians.phone_e164, the family's only number). */
  async byPhone(phone: string): Promise<RegistrationMatch[]> {
    const { data, error } = await this.db
      .from('students')
      .select(`${COLUMNS}, guardian:guardians!inner(phone_e164)`)
      .eq('guardian.phone_e164', phone)
      .order('name')
      .limit(READ);
    if (error) throw dbError(error);
    return data.map(toMatch);
  }

  /** An Arabic-normalised name or a code, as the admin's list searches (studentNameOrCodeFilter). */
  async byName(q: string): Promise<RegistrationMatch[]> {
    // `_` is ilike's one-character wildcard: the check would match too much, so it searches it as a space.
    const filter = studentNameOrCodeFilter(q.replace(/_/g, ' '));
    if (!filter) return [];
    const { data, error } = await this.db.from('students').select(COLUMNS).or(filter).order('name').limit(READ);
    if (error) throw dbError(error);
    return data.map(toMatch);
  }
}
