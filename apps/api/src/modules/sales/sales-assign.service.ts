import { pickSales, type SalesPersonView } from '@ab/shared';
import { Injectable, Logger } from '@nestjs/common';
import type { Tables } from '@ab/db';
import { AuditService } from '../../common/audit/audit.service';
import { badRequest, notFound } from '../../common/http/errors';
import { toCandidates } from './sales-assign.mapper';
import { SalesAssignQueries } from './sales-assign.queries';
import { SalesSettings } from './sales.settings';

/**
 * Who gets a lead. Assignment is the API's job, never a trigger: seed:demo and migrate:apply must
 * not hand imported leads to real salespeople. Switch: settings key sales_auto_assign.
 */
@Injectable()
export class SalesAssignService {
  private readonly log = new Logger(SalesAssignService.name);

  constructor(
    private readonly queries: SalesAssignQueries,
    private readonly settings: SalesSettings,
    private readonly audit: AuditService,
  ) {}

  /**
   * A lead that was just CREATED goes to the least loaded salesperson. Never throws (the webhook
   * must succeed): any failure is logged and the lead stays as it is. Returns the lead as it is now.
   */
  async autoAssign(lead: Tables<'leads'>): Promise<Tables<'leads'>> {
    try {
      if (lead.assigned_to || !(await this.settings.read()).sales_auto_assign) return lead;
      const picked = pickSales((await this.people()).candidates);
      if (!picked) return lead;
      return (await this.queries.setAssignee({ leadId: lead.id, profileId: picked, onlyIfFree: true })) ?? lead;
    } catch (e) {
      this.log.warn(`auto-assign of lead ${lead.id} failed: ${e instanceof Error ? e.message : String(e)}`);
      return lead;
    }
  }

  /** POST /leads/:id/assign: a salesperson, or null to unassign. */
  async assign(input: { leadId: string; profileId: string | null; actorId: string }): Promise<Tables<'leads'>> {
    const { leadId, profileId, actorId } = input;
    if (profileId && !(await this.queries.isSalesperson(profileId))) throw badRequest('not_a_salesperson');
    const lead = await this.queries.setAssignee({ leadId, profileId });
    if (!lead) throw notFound('lead_not_found');
    await this.audit.record({ actorId, entity: 'leads', entityId: leadId, action: 'assign', before: null, after: { assigned_to: profileId } });
    return lead;
  }

  /** POST /leads/assign-unassigned: every lead without an owner, one by one, each to the then least loaded. */
  async assignUnassigned(): Promise<{ assigned: number }> {
    const ids = await this.queries.unassignedLeadIds();
    let assigned = 0;
    for (const leadId of ids) {
      const picked = pickSales((await this.people()).candidates);
      if (!picked) break;
      if (await this.queries.setAssignee({ leadId, profileId: picked, onlyIfFree: true })) assigned += 1;
    }
    return { assigned };
  }

  /** GET /sales/people: the admin picker. */
  async list(): Promise<SalesPersonView[]> {
    const { views } = await this.people();
    return views;
  }

  /** leads.assigned_to -> name, for the leads list. */
  names(ids: readonly string[]): Promise<Map<string, string>> {
    return this.queries.names(ids);
  }

  private async people() {
    const sales = await this.queries.salespeople();
    const ids = sales.map((s) => s.id);
    const candidates = toCandidates(ids, await this.queries.assignedLeads(ids));
    const open = new Map(candidates.map((c) => [c.id, c.openLeads]));
    const views = sales.map((s) => ({ id: s.id, name: s.full_name, open_leads: open.get(s.id) ?? 0 }));
    return { candidates, views };
  }
}
