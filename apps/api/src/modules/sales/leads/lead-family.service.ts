import type { LeadFamilyLinked, LeadStatus } from '@ab/shared';
import { Inject, Injectable } from '@nestjs/common';
import type { PostgrestError } from '@supabase/supabase-js';
import { AuditService } from '../../../common/audit/audit.service';
import { DB, type Db } from '../../../common/db/db.module';
import { conflict, notFound } from '../../../common/http/errors';
import { dbError } from '../../../common/http/http';
import { canTransitionLead } from './lead-state-machine';

type LinkInput = { leadId: string; code: string; actorId: string };
type Lead = { id: string; status: LeadStatus; phone_e164: string };
type Target = { lead: Lead; guardianId: string; code: string; actorId: string };
/** Who holds a number in guardian_phones already. */
type Holder = { guardian_id: string; is_primary: boolean };

/** false = already this family's number (main or second); 409 for another family's number. */
function sameFamily(held: Holder, guardianId: string): false {
  if (held.guardian_id === guardianId) return false;
  throw conflict(held.is_primary ? 'lead_has_family' : 'number_taken');
}

/**
 * «ربط بطالب موجود» (owner 2026-10-29): POST /leads/:id/link-family adds the lead chat's number as the SECOND
 * number of the family of the student with this code (public.guardian_phones), audited (guardians /
 * phone_linked), then moves the lead to converted by a compare-and-set with its own audit row when the funnel
 * allows it. It NEVER sets leads.converted_guardian_id nor changes leads.assigned_to: linking makes nobody an
 * owner of that family (my_sales_guardian_ids, ownershipOf). Every step is idempotent: a retry completes it.
 * 404 lead_not_found / student_not_found; 409 number_taken, family_has_second_number, teacher_number,
 * lead_has_family (the number is another family's main number).
 */
@Injectable()
export class LeadFamilyService {
  constructor(
    @Inject(DB) private readonly db: Db,
    private readonly audit: AuditService,
  ) {}

  async link({ leadId, code, actorId }: LinkInput): Promise<LeadFamilyLinked> {
    const lead = await this.lead(leadId);
    const guardianId = await this.familyOf(code);
    const linked = await this.addSecond({ lead, guardianId, code, actorId });
    await this.convert(lead, actorId);
    return { linked };
  }

  private async lead(id: string): Promise<Lead> {
    const { data, error } = await this.db.from('leads').select('id, status, phone_e164').eq('id', id).maybeSingle();
    if (error) throw dbError(error);
    if (!data) throw notFound('lead_not_found');
    return data;
  }

  /** students.code is unique and generated (rule 7). */
  private async familyOf(code: string): Promise<string> {
    const { data, error } = await this.db.from('students').select('guardian_id').eq('code', code).maybeSingle();
    if (error) throw dbError(error);
    if (!data) throw notFound('student_not_found');
    return data.guardian_id;
  }

  private async holder(phone: string): Promise<Holder | null> {
    const { data, error } = await this.db.from('guardian_phones').select('guardian_id, is_primary').eq('phone_e164', phone).maybeSingle();
    if (error) throw dbError(error);
    return data;
  }

  private async addSecond(t: Target): Promise<boolean> {
    const phone = t.lead.phone_e164;
    const held = await this.holder(phone);
    if (held) return sameFamily(held, t.guardianId);
    const row = { phone_e164: phone, guardian_id: t.guardianId, is_primary: false, created_by: t.actorId };
    const { error } = await this.db.from('guardian_phones').insert(row);
    if (error) return this.insertFailed(error, t);
    const after = { phone_e164: phone, lead_id: t.lead.id, student_code: t.code };
    await this.audit.record({ actorId: t.actorId, entity: 'guardians', entityId: t.guardianId, action: 'phone_linked', after });
    return true;
  }

  /** The triggers' and the indexes' answers (migration 973); a lost race on the number reads it again. */
  private async insertFailed(error: PostgrestError, t: Target): Promise<boolean> {
    const text = `${error.message} ${error.details ?? ''}`;
    if (error.code === 'P0001' && text.includes('teacher_number')) throw conflict('teacher_number');
    if (error.code !== '23505') throw dbError(error);
    if (text.includes('guardian_phones_one_second')) throw conflict('family_has_second_number');
    const held = await this.holder(t.lead.phone_e164);
    if (!held) throw dbError(error);
    return sameFamily(held, t.guardianId);
  }

  /** Compare-and-set to converted, audited; a terminal status (or a concurrent move) is left as it is. */
  private async convert(lead: Lead, actorId: string): Promise<void> {
    if (!canTransitionLead(lead.status, 'converted')) return;
    const { data, error } = await this.db
      .from('leads')
      .update({ status: 'converted' })
      .eq('id', lead.id)
      .eq('status', lead.status)
      .select('id')
      .maybeSingle();
    if (error) throw dbError(error);
    if (!data) return;
    const entry = { actorId, entity: 'leads', entityId: lead.id, action: 'status_change' };
    await this.audit.record({ ...entry, before: { status: lead.status }, after: { status: 'converted', via: 'link_family' } });
  }
}
