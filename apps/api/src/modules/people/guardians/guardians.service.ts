import type { Tables } from '@ab/db';
import type { GuardianCreate, GuardianUpdate } from '@ab/shared';
import { searchDigits } from '@ab/core';
import { Inject, Injectable, NotFoundException } from '@nestjs/common';
import { DB, type Db } from '@/common/db/db.module';
import { guardianSearchFilter, toGuardianInsert, toGuardianPatch } from './guardians.mapper';
import { peopleErrors, pageRange, type ListQuery } from './http';
import { maybe, one, pgError, rows } from '@/common/db/errors';
import type { Page } from '@ab/core';

export type Guardian = Tables<'guardians'>;
type Sibling = Pick<Tables<'students'>, 'id' | 'code' | 'name' | 'status'>;
type FamilyNumber = Pick<Tables<'guardian_phones'>, 'phone_e164' | 'is_primary' | 'created_at'>;
/** phones: every family number, the main one (is_primary) and a second one (guardian_phones). */
export type GuardianWithStudents = Guardian & { students: Sibling[]; phones: FamilyNumber[] };

/** Guardians CRUD (R-STU-02, R-STU-04). A guardian owns many students (siblings). */
@Injectable()
export class GuardiansService {
  constructor(@Inject(DB) private readonly db: Db) {}

  async list(q: ListQuery): Promise<Page<Guardian>> {
    let query = this.db
      .from('guardians')
      .select('*', { count: 'exact' })
      .order('created_at', { ascending: false });
    const digits = searchDigits(q.search);
    if (digits) query = query.in('id', await this.idsByNumber(digits));
    const filter = digits ? null : guardianSearchFilter(q.search);
    if (filter) query = query.or(filter);
    const [from, to] = pageRange(q);
    const { data, error, count } = await query.range(from, to);
    if (error) throw pgError(error, peopleErrors());
    return { items: data, total: count ?? 0, page: q.page, pageSize: q.pageSize };
  }

  /**
   * The families with a number (main or second, guardian_phones) holding these digits.
   * ponytail: the first 100 (the ids go into the URL), as the students' digit search.
   */
  private async idsByNumber(digits: string): Promise<string[]> {
    const data = rows(await this.db.from('guardian_phones').select('guardian_id').ilike('phone_e164', `%${digits}%`).limit(100), peopleErrors());
    return [...new Set(data.map((p) => p.guardian_id))];
  }

  async get(id: string): Promise<GuardianWithStudents> {
    const data = maybe(await this.db
      .from('guardians')
      .select('*, students(id, code, name, status), phones:guardian_phones(phone_e164, is_primary, created_at)')
      .eq('id', id)
      // A student's own number (student_id) is the student's, not the family's.
      .is('phones.student_id', null)
      .maybeSingle(), peopleErrors());
    if (!data) throw new NotFoundException();
    return data;
  }

  /** Phones are unique per guardian, so "same phone" means "same guardian" (R-STU-03). */
  async findByPhone(e164: string): Promise<Guardian | null> {
    const data = maybe(await this.db
      .from('guardians')
      .select('*')
      .eq('phone_e164', e164)
      .maybeSingle(), peopleErrors());
    return data;
  }

  async create(dto: GuardianCreate, actorId: string): Promise<Guardian> {
    const data = one(await this.db
      .from('guardians')
      .insert(toGuardianInsert(dto, actorId))
      .select()
      .single(), peopleErrors('phone_taken'));
    return data;
  }

  async update(id: string, dto: GuardianUpdate): Promise<Guardian> {
    const data = one(await this.db
      .from('guardians')
      .update(toGuardianPatch(dto))
      .eq('id', id)
      .select()
      .single(), peopleErrors('phone_taken'));
    return data;
  }

  /** 409 `has_students` while any student still points at the guardian. */
  async remove(id: string): Promise<void> {
    const data = rows(await this.db.from('guardians').delete().eq('id', id).select('id'), peopleErrors('has_students'));
    if (!data.length) throw new NotFoundException();
  }
}
