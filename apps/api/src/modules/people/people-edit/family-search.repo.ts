import type { FamilyOption } from '@ab/shared';
import { searchDigits } from '@ab/shared';
import { Inject, Injectable } from '@nestjs/common';
import { DB, type Db } from '@/common/db/db.module';
import { dbError } from '@/common/http/http';

const OPTION = 'id, name, phone_e164, students(code, name)';
const LIMIT = 10;
const CODE = /^AB-\d{4,}$/i;

type Search = (db: Db, term: string) => Promise<string[]>;

/** The families of a student code (AB-nnnn): exact, upper-cased. */
const byCode: Search = async (db, term) => {
  const query = db.from('students').select('guardian_id').eq('code', term.toUpperCase());
  const { data, error } = await query.limit(LIMIT);
  if (error) throw dbError(error);
  return data.map((s) => s.guardian_id);
};

/** The families with a number (main or second) holding these digits, as GuardiansService.list. */
const byNumber: Search = async (db, term) => {
  const digits = searchDigits(term) ?? '';
  const query = db.from('guardian_phones').select('guardian_id').ilike('phone_e164', `%${digits}%`);
  const { data, error } = await query.limit(LIMIT);
  if (error) throw dbError(error);
  return data.map((p) => p.guardian_id);
};

/** The families whose name holds the term (wildcards dropped). */
const byName: Search = async (db, term) => {
  const safe = term.replace(/[%_\\]/g, '');
  const query = db.from('guardians').select('id').ilike('name', `%${safe}%`);
  const { data, error } = await query.limit(LIMIT);
  if (error) throw dbError(error);
  return data.map((g) => g.id);
};

/** A code first, then digits (a number), else a name. */
const KINDS: readonly [Search, (term: string) => boolean][] = [
  [byCode, (term) => CODE.test(term)],
  [byNumber, (term) => Boolean(searchDigits(term))],
];
const searchOf = (term: string): Search => KINDS.find(([, test]) => test(term))?.[0] ?? byName;

/** «ربط بولي أمر آخر»: the guardian picker, by name, number or a child's code; ten at most. */
@Injectable()
export class FamilySearchRepo {
  constructor(@Inject(DB) private readonly db: Db) {}

  async search(term: string): Promise<FamilyOption[]> {
    const ids = [...new Set(await searchOf(term)(this.db, term))];
    if (ids.length === 0) return [];
    const { data, error } = await this.db
      .from('guardians')
      .select(OPTION)
      .in('id', ids)
      .order('created_at', { ascending: false })
      .overrideTypes<FamilyOption[], { merge: false }>();
    if (error) throw dbError(error);
    return data;
  }
}
