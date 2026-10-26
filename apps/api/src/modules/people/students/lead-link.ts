import type { LeadStatus } from '@ab/shared';
import { NotFoundException } from '@nestjs/common';
import type { AuditService } from '../../../common/audit/audit.service';
import type { Db } from '../../../common/db/db.module';
import { dbError } from '../guardians/http';
import { canTransitionLead } from '../../sales/leads/lead-state-machine';

export type LinkedLead = { id: string; status: LeadStatus; converted_guardian_id: string | null };
export type LeadLinkInput = { lead: LinkedLead; guardianId: string; actorId: string };

/**
 * «تسجيل الطالب» from the inbox thread (R-LEAD-06, R-STU-02): POST /students with `lead_id` links
 * the lead to the family like create_booking does (converted_guardian_id, kept when already set)
 * and moves it to `converted` when the funnel allows it. Compare-and-set on the status, so a
 * concurrent change wins; a terminal status only gets the link. Audited like a status change.
 */
export class LeadLink {
  constructor(
    private readonly db: Db,
    private readonly audit: AuditService,
  ) {}

  /** Checked before any write: 404 `lead_not_found`. */
  async find(id: string): Promise<LinkedLead> {
    const { data, error } = await this.db
      .from('leads')
      .select('id, status, converted_guardian_id')
      .eq('id', id)
      .maybeSingle();
    if (error) throw dbError(error);
    if (!data) throw new NotFoundException('lead_not_found');
    return data;
  }

  async convert({ lead, guardianId, actorId }: LeadLinkInput): Promise<void> {
    const converted_guardian_id = lead.converted_guardian_id ?? guardianId;
    if (!canTransitionLead(lead.status, 'converted')) {
      if (!lead.converted_guardian_id) await this.linkOnly(lead.id, guardianId);
      return;
    }
    const { data, error } = await this.db
      .from('leads')
      .update({ status: 'converted', converted_guardian_id })
      .eq('id', lead.id)
      .eq('status', lead.status)
      .select('id')
      .maybeSingle();
    if (error) throw dbError(error);
    if (!data) return;
    const entry = { actorId, entity: 'leads', entityId: lead.id, action: 'status_change' };
    await this.audit.record({ ...entry, before: { status: lead.status }, after: { status: 'converted', via: 'registration' } });
  }

  private async linkOnly(id: string, guardianId: string): Promise<void> {
    const { error } = await this.db
      .from('leads')
      .update({ converted_guardian_id: guardianId })
      .eq('id', id)
      .is('converted_guardian_id', null);
    if (error) throw dbError(error);
  }
}
