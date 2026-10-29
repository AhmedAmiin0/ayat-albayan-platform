import { LEAD_FAMILY_LINK_ERRORS, type LeadFamilyLinked } from '@ab/shared';
import { Inject, Injectable } from '@nestjs/common';
import type { PostgrestError } from '@supabase/supabase-js';
import { DB, type Db } from '../../../common/db/db.module';
import { conflict, notFound } from '../../../common/http/errors';
import { dbError } from '../../../common/http/http';

type LinkInput = { leadId: string; code: string; actorId: string };

const NOT_FOUND: readonly string[] = ['lead_not_found', 'student_not_found'];

/** A guardians write took the number between link_family_phone's read and its insert. */
const lostRace = (error: PostgrestError | null): boolean =>
  error?.code === '23505' && error.message.includes('guardian_phones_pkey');

/** link_family_phone's refusals (migration 973) as the API's 404 / 409 codes. */
function linkError(error: PostgrestError): Error {
  if (error.code === '23505' && error.message.includes('guardian_phones_one_second')) return conflict('family_has_second_number');
  if (error.code === '23505') return conflict('number_taken');
  const code = error.code === 'P0001' ? LEAD_FAMILY_LINK_ERRORS.find((c) => c === error.message) : undefined;
  if (!code) return dbError(error);
  return NOT_FOUND.includes(code) ? notFound(code) : conflict(code);
}

/**
 * «ربط بطالب موجود» (owner 2026-10-29): POST /leads/:id/link-family adds the lead chat's number as the SECOND
 * number of the family of the student with this code and moves the lead to converted, both with their audit
 * rows in ONE transaction (link_family_phone, migration 973; the lead row is locked, so a concurrent status move
 * cannot leave a linked number on a lead still in follow-up). It never sets leads.converted_guardian_id nor
 * leads.assigned_to: linking makes nobody an owner of that family. A retry is idempotent (linked: false).
 * 404 lead_not_found / student_not_found; 409 number_taken, family_has_second_number, teacher_number,
 * lead_has_family (the number is another family's main number).
 */
@Injectable()
export class LeadFamilyService {
  constructor(@Inject(DB) private readonly db: Db) {}

  async link({ leadId, code, actorId }: LinkInput): Promise<LeadFamilyLinked> {
    const call = () => this.db.rpc('link_family_phone', { p_lead: leadId, p_code: code, p_actor: actorId });
    let { data, error } = await call();
    // Once more after a lost race: the number's new holder answers (this family → false, another → its 409).
    if (lostRace(error)) ({ data, error } = await call());
    if (error) throw linkError(error);
    return { linked: data === true };
  }
}
