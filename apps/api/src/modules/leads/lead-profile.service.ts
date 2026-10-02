import type { Json } from '@ab/db';
import { nextFollowUpAt, type LeadFollowUp, type LeadQualificationPatch } from '@ab/shared';
import { Injectable, NotFoundException } from '@nestjs/common';
import { AuditService } from '../../common/audit/audit.service';
import { SettingsService } from '../../common/settings/settings.service';
import { LeadsQueries, type LeadRow } from './leads.queries';

export interface LeadPatch<T> {
  id: string;
  patch: T;
  actorId: string;
}

/** L1 merge: sent keys overwrite, null clears, keys not sent stay (R-LEAD-03). */
export function mergeQualification(current: Json, patch: LeadQualificationPatch): Record<string, Json> {
  const base = current && typeof current === 'object' && !Array.isArray(current) ? current : {};
  const merged: Record<string, Json | undefined> = { ...base, ...patch };
  return Object.fromEntries(
    Object.entries(merged).filter((e): e is [string, Json] => e[1] !== null && e[1] !== undefined),
  );
}

/** L1/L2 (docs/12 §4): the in-thread qualification form and the per-lead follow-up pause. Audited. */
@Injectable()
export class LeadProfileService {
  constructor(
    private readonly leads: LeadsQueries,
    private readonly settings: SettingsService,
    private readonly audit: AuditService,
  ) {}

  async qualification({ id, patch, actorId }: LeadPatch<LeadQualificationPatch>): Promise<LeadRow> {
    const lead = await this.find(id);
    const qualification = mergeQualification(lead.qualification, patch);
    const updated = await this.leads.update(id, { qualification });
    await this.record({ lead: updated, action: 'qualification_update', before: { qualification: lead.qualification }, actorId });
    return updated;
  }

  /** R-LEAD-05: pause clears next_follow_up_at; resume recomputes it from the settings. */
  async followUp({ id, patch, actorId }: LeadPatch<LeadFollowUp>): Promise<LeadRow> {
    const lead = await this.find(id);
    const { follow_up_hours: hours } = await this.settings.all();
    const next = nextFollowUpAt({ ...lead, follow_up_paused: patch.paused }, hours);
    const updated = await this.leads.update(id, {
      follow_up_paused: patch.paused,
      next_follow_up_at: next ? next.toISOString() : null,
    });
    await this.record({ lead: updated, action: 'follow_up_pause', before: { follow_up_paused: lead.follow_up_paused }, actorId });
    return updated;
  }

  private async find(id: string): Promise<LeadRow> {
    const lead = await this.leads.findById(id);
    if (!lead) throw new NotFoundException();
    return lead;
  }

  private record(input: { lead: LeadRow; action: string; before: Json; actorId: string }): Promise<void> {
    const after = input.action === 'qualification_update'
      ? { qualification: input.lead.qualification }
      : { follow_up_paused: input.lead.follow_up_paused, next_follow_up_at: input.lead.next_follow_up_at };
    return this.audit.record({ actorId: input.actorId, entity: 'leads', entityId: input.lead.id, action: input.action, before: input.before, after });
  }
}
