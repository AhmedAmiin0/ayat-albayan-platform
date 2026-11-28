import type { LeadStatus } from '@ab/catalog';
import { NotFoundException } from '@nestjs/common';
import type { AuditService } from '@/common/audit/audit.service';
import type { Db } from '@/common/db/db.module';
import { peopleErrors } from '@/modules/people/guardians/http';
import { done, maybe } from '@/common/db/errors';
import { canTransitionLead } from '@ab/catalog';

export interface LinkedLead { id: string; status: LeadStatus; converted_guardian_id: string | null }
interface LeadLinkInput { lead: LinkedLead; guardianId: string; actorId: string }

/** R-LEAD-06, R-STU-02: compare-and-set on status; a terminal status only gets the link. */
export class LeadLink {
  constructor(
    private readonly db: Db,
    private readonly audit: AuditService,
  ) {}

  /** Checked before any write: 404 `lead_not_found`. */
  async find(id: string): Promise<LinkedLead> {
    const data = maybe(
      await this.db
        .from('leads')
        .select('id, status, converted_guardian_id')
        .eq('id', id)
        .maybeSingle(),
      peopleErrors(),
    );
    if (!data) throw new NotFoundException('lead_not_found');
    return data;
  }

  async convert({ lead, guardianId, actorId }: LeadLinkInput): Promise<void> {
    const converted_guardian_id = lead.converted_guardian_id ?? guardianId;
    if (!canTransitionLead(lead.status, 'converted')) {
      if (!lead.converted_guardian_id) await this.linkOnly(lead.id, guardianId);
      return;
    }
    const data = maybe(
      await this.db
        .from('leads')
        .update({ status: 'converted', converted_guardian_id })
        .eq('id', lead.id)
        .eq('status', lead.status)
        .select('id')
        .maybeSingle(),
      peopleErrors(),
    );
    if (!data) return;
    const entry = { actorId, entity: 'leads', entityId: lead.id, action: 'status_change' };
    await this.audit.record({
      ...entry,
      before: { status: lead.status },
      after: { status: 'converted', via: 'registration' },
    });
  }

  private async linkOnly(id: string, guardianId: string): Promise<void> {
    done(
      await this.db
        .from('leads')
        .update({ converted_guardian_id: guardianId })
        .eq('id', id)
        .is('converted_guardian_id', null),
      peopleErrors(),
    );
  }
}
