import type { Json } from '@ab/db';
import { nextFollowUpAt, SETTING_DEFAULTS, validTiming, type LeadFollowUp, type LeadQualificationPatch } from '@ab/shared';
import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { AuditService } from '../../common/audit/audit.service';
import { NotificationPolicy } from '../notification-rules/policy/policy';
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
  private readonly log = new Logger(LeadProfileService.name);

  constructor(
    private readonly leads: LeadsQueries,
    private readonly policy: NotificationPolicy,
    private readonly audit: AuditService,
  ) {}

  async qualification({ id, patch, actorId }: LeadPatch<LeadQualificationPatch>): Promise<LeadRow> {
    const lead = await this.find(id);
    const qualification = mergeQualification(lead.qualification, patch);
    const updated = await this.leads.update(id, { qualification });
    await this.record({ lead: updated, action: 'qualification_update', before: { qualification: lead.qualification }, actorId });
    return updated;
  }

  /**
   * R-LEAD-05: pause clears next_follow_up_at; resume recomputes it from the follow_up_slots hours. The pause is
   * the admin's (follow_up_paused_by); a lead's own «وقف» is recorded as theirs by the webhook.
   */
  async followUp({ id, patch, actorId }: LeadPatch<LeadFollowUp>): Promise<LeadRow> {
    const lead = await this.find(id);
    const hours = await this.followUpHours();
    const next = nextFollowUpAt({ ...lead, follow_up_paused: patch.paused }, hours);
    const updated = await this.leads.update(id, {
      follow_up_paused: patch.paused,
      follow_up_paused_by: patch.paused ? 'admin' : null,
      next_follow_up_at: next ? next.toISOString() : null,
    });
    await this.record({ lead: updated, action: 'follow_up_pause', before: { follow_up_paused: lead.follow_up_paused }, actorId });
    return updated;
  }

  /**
   * The follow_up_slots rule's hours (legacy: settings.follow_up_hours). Only shown on the lead, never a
   * send: an unreadable rule falls back to the registry default (logged) instead of failing the request.
   */
  private async followUpHours(): Promise<readonly number[]> {
    const timing = validTiming('follow_up_slots', (await this.policy.rule('follow_up_slots')).timing);
    if (timing && 'hours' in timing) return timing.hours;
    this.log.warn('follow_up_slots timing unread: the next follow-up shown uses the default hours');
    return SETTING_DEFAULTS.follow_up_hours;
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
