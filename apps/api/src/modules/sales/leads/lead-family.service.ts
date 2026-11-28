import { LEAD_FAMILY_LINK_ERRORS, type LeadFamilyLinked } from '@ab/shared';
import { Inject, Injectable } from '@nestjs/common';
import type { PostgrestError } from '@supabase/supabase-js';
import { DB, type Db } from '@/common/db/db.module';
import { conflict, notFound } from '@/common/http/errors';
import { isUniqueViolation, maybe, pgError, uniqueViolationMentions } from '@/common/db/errors';

interface LinkInput { leadId: string; code: string; actorId: string; admin: boolean }

const NOT_FOUND: readonly string[] = ['lead_not_found', 'student_not_found'];

/** A guardians write took the number between link_family_phone's read and its insert. */
const lostRace = (error: PostgrestError | null): boolean =>
  uniqueViolationMentions(error, 'guardian_phones_pkey');

/** link_family_phone's refusals (migration 973) as the API's 404 / 409 codes. */
function linkError(error: PostgrestError): Error {
  if (uniqueViolationMentions(error, 'guardian_phones_one_second')) return conflict('family_has_second_number');
  if (isUniqueViolation(error)) return conflict('number_taken');
  const code = error.code === 'P0001' ? LEAD_FAMILY_LINK_ERRORS.find((c) => c === error.message) : undefined;
  if (!code) return pgError(error);
  return NOT_FOUND.includes(code) ? notFound(code) : conflict(code);
}

/** One transaction with audit rows (migration 973); nobody becomes the family's owner. */
@Injectable()
export class LeadFamilyService {
  constructor(@Inject(DB) private readonly db: Db) {}

  async link({ leadId, code, actorId, admin }: LinkInput): Promise<LeadFamilyLinked> {
    if (!admin) await this.assertNoLogin(code);
    const call = () => this.db.rpc('link_family_phone', { p_lead: leadId, p_code: code, p_actor: actorId });
    let { data, error } = await call();
    // Once more after a lost race: the number's new holder answers (this family → false, another → its 409).
    if (lostRace(error)) ({ data, error } = await call());
    if (error) throw linkError(error);
    return { linked: data === true };
  }

  /** An unknown code passes: link_family_phone answers 404 student_not_found. */
  private async assertNoLogin(code: string): Promise<void> {
    const query = this.db.from('students').select('guardian:guardians!inner(profile_id)');
    const data = maybe(await query.eq('code', code).maybeSingle());
    if (data?.guardian.profile_id) throw conflict('guardian_has_login');
  }
}
