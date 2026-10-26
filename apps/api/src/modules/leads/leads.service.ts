import { normalizePhone, type LeadSource, type LeadStatus } from '@ab/shared';
import {
  BadRequestException,
  ConflictException,
  Inject,
  Injectable,
  NotFoundException,
  Optional,
} from '@nestjs/common';
import { AuditService } from '../../common/audit/audit.service';
import { SalesAssignService } from '../sales/assign/sales-assign.service';
import { JobApplicantsQueries, type JobApplicantRow } from '../job-applicants/job-applicants.queries';
import type { Page } from './http';
import { canTransitionLead } from './lead-state-machine';
import { LeadsQueries, type LeadListFilter, type LeadRow } from './leads.queries';

export interface InboundContact {
  /** Raw WhatsApp / typed phone; normalised to E.164 (rule 7). */
  phone: string;
  /** WhatsApp profile name; only fills an empty lead name. */
  name?: string | null;
  /** Used for a new lead only; an existing lead keeps its source. */
  source?: LeadSource;
  /** Message time (UTC); defaults to now. */
  at?: Date;
}

export interface LeadAction {
  id: string;
  actorId: string | null;
}

/** A lead row with its salesperson's name (the admin's list). */
export type LeadView = LeadRow & { assigned_to_name: string | null };

export const invalidTransition = (from: string, to: string) =>
  new ConflictException({ code: 'invalid_transition', from, to });

@Injectable()
export class LeadsService {
  /** Property-injected (the constructor is at the 3-parameter limit); absent in plain unit tests = no assignment. */
  @Optional() @Inject(SalesAssignService) private readonly sales?: SalesAssignService;

  constructor(
    private readonly leads: LeadsQueries,
    private readonly applicants: JobApplicantsQueries,
    private readonly audit: AuditService,
  ) {}

  /**
   * R-LEAD-01: create or update the lead for an inbound contact (called by the Phase 4 webhook).
   * Never changes status/source of an existing lead. Returns null when the phone is a job
   * applicant, so a reclassified number never re-enters the funnel (R-LEAD-04).
   * TODO(R-LEAD-01): should an inbound message reopen a `lost` / `no_reply` lead? Not done.
   */
  async upsertByPhone(c: InboundContact): Promise<LeadRow | null> {
    const phone = normalizePhone(c.phone);
    if (!phone.ok) throw new BadRequestException({ code: 'invalid_phone', reason: phone.reason });
    if (await this.applicants.findByPhone(phone.e164)) return null;
    const contact = { name: c.name?.trim() || null, at: c.at ?? new Date() };
    const existing = await this.leads.findByPhone(phone.e164);
    if (existing) return this.touch(existing, contact);
    try {
      const created = await this.leads.insert({
        phone_e164: phone.e164,
        name: contact.name,
        source: c.source,
        last_inbound_at: contact.at.toISOString(),
      });
      // Only a lead created right here is handed to a salesperson; an existing one never is (above, and the winner below).
      return await this.assigned(created);
    } catch (e) {
      // Two first messages from one phone at once: the other insert won, so update it instead.
      const winner = e instanceof ConflictException && (await this.leads.findByPhone(phone.e164));
      if (!winner) throw e;
      return this.touch(winner, contact);
    }
  }

  /** A salesperson for a lead just created (never throws; no assigner = unchanged). */
  private assigned(lead: LeadRow): Promise<LeadRow> {
    return this.sales ? this.sales.autoAssign(lead) : Promise.resolve(lead);
  }

  private touch(lead: LeadRow, c: { name: string | null; at: Date }): Promise<LeadRow> {
    // Webhooks can arrive out of order: last_inbound_at only moves forward.
    const prev = lead.last_inbound_at ? Date.parse(lead.last_inbound_at) : 0;
    return this.leads.update(lead.id, {
      last_inbound_at: new Date(Math.max(prev, c.at.getTime())).toISOString(),
      name: lead.name ?? c.name,
    });
  }

  async list(f: LeadListFilter): Promise<Page<LeadView>> {
    const { items, total } = await this.leads.list(f);
    const ids = [...new Set(items.flatMap((l) => (l.assigned_to ? [l.assigned_to] : [])))];
    const names = this.sales ? await this.sales.names(ids) : new Map<string, string>();
    const views = items.map((l) => ({ ...l, assigned_to_name: l.assigned_to ? (names.get(l.assigned_to) ?? null) : null }));
    return { items: views, total, page: f.page, pageSize: f.pageSize };
  }

  /** PATCH status through the LeadStateMachine; audited (R-NFR-03). */
  async changeStatus({ id, actorId, to }: LeadAction & { to: LeadStatus }): Promise<LeadRow> {
    const lead = await this.leads.findById(id);
    if (!lead) throw new NotFoundException();
    if (!canTransitionLead(lead.status, to)) throw invalidTransition(lead.status, to);
    const moved = await this.leads.moveStatus({ id, from: lead.status, to });
    if (!moved) throw invalidTransition(lead.status, to); // changed concurrently
    await this.audit.record({
      actorId,
      entity: 'leads',
      entityId: id,
      action: 'status_change',
      before: { status: lead.status },
      after: { status: to },
    });
    return moved;
  }

  /**
   * R-LEAD-04: move a lead into job_applicants in one action. The lead row is deleted so it is
   * never counted in the funnel; the audit row keeps the full lead snapshot and the link
   * (from_lead_id is nulled by its FK on delete).
   * ponytail: three writes without a transaction, ordered so a retry converges (existing
   * applicant reused, audit before delete). Move into a Postgres RPC if partial failures show up.
   */
  async reclassify({ id, actorId }: LeadAction): Promise<JobApplicantRow> {
    const lead = await this.leads.findById(id);
    if (!lead) throw new NotFoundException();
    const applicant =
      (await this.applicants.findByPhone(lead.phone_e164)) ??
      (await this.applicants.insert({
        phone_e164: lead.phone_e164,
        name: lead.name,
        from_lead_id: lead.id,
        created_by: actorId,
      }));
    await this.audit.record({
      actorId,
      entity: 'leads',
      entityId: lead.id,
      action: 'reclassify_to_job_applicant',
      before: lead,
      after: { job_applicant_id: applicant.id },
    });
    await this.leads.remove(lead.id);
    return applicant;
  }
}
