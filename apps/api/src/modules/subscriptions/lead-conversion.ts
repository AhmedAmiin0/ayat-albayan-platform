import type { LeadStatus } from '@ab/shared';
import { Inject, Injectable } from '@nestjs/common';
import { AuditService } from '../../common/audit/audit.service';
import { DB, type Db } from '../../common/db/db.module';
import { canTransitionLead } from '../leads/lead-state-machine';
import { dbError } from '../teachers/http';

type LeadRef = { id: string; status: LeadStatus; converted_guardian_id: string | null };

/**
 * A paid package from POST /subscriptions converts the family's lead (R-LEAD-01, R-SUB-01): the
 * lead the booking linked to the guardian (converted_guardian_id), else the lead on the guardian's
 * phone. Booking a paid package already converts through leadTarget; this covers the common funnel
 * of a trial first, then «اشتراك جديد» from the guardian's chat. Compare-and-set on the status, so a
 * concurrent change wins; a terminal or disallowed status is left alone. Audited like a status change.
 */
@Injectable()
export class LeadConversion {
  constructor(
    @Inject(DB) private readonly db: Db,
    private readonly audit: AuditService,
  ) {}

  async afterPackage(studentId: string, actorId: string): Promise<void> {
    const lead = await this.leadOf(studentId);
    if (!lead || !canTransitionLead(lead.lead.status, 'converted')) return;
    const { id, status } = lead.lead;
    const { data, error } = await this.db
      .from('leads')
      .update({ status: 'converted', converted_guardian_id: lead.lead.converted_guardian_id ?? lead.guardianId })
      .eq('id', id)
      .eq('status', status)
      .select('id')
      .maybeSingle();
    if (error) throw dbError(error);
    if (!data) return;
    const entry = { actorId, entity: 'leads', entityId: id, action: 'status_change' };
    await this.audit.record({ ...entry, before: { status }, after: { status: 'converted', via: 'subscription' } });
  }

  private async leadOf(studentId: string): Promise<{ lead: LeadRef; guardianId: string } | null> {
    const student = await this.db.from('students').select('guardian:guardians(id, phone_e164)').eq('id', studentId).maybeSingle();
    if (student.error) throw dbError(student.error);
    const guardian = student.data?.guardian;
    if (!guardian) return null;
    const { data, error } = await this.db
      .from('leads')
      .select('id, status, converted_guardian_id')
      .or(`converted_guardian_id.eq.${guardian.id},phone_e164.eq."${guardian.phone_e164}"`)
      .order('created_at')
      .limit(1);
    if (error) throw dbError(error);
    const [lead] = data;
    return lead ? { lead, guardianId: guardian.id } : null;
  }
}
