import type { AssistantTermsInput, BroughtByView, AssistantTermsRow, AssistantTermsView } from '@ab/shared';
import { Injectable } from '@nestjs/common';
import { AuditService } from '../../../../common/audit/audit.service';
import { notFound } from '../../../../common/http/errors';
import { AssistantRpc } from '../assistant-pay.rpc';
import { termsColumns, toTermsView } from './terms.mapper';
import { TermsQueries } from './terms.queries';

/** The commission and salary terms of each assistant (R-ASST-02, R-ASST-03): set by an admin, read-only for the assistant. */
@Injectable()
export class TermsService {
  constructor(
    private readonly queries: TermsQueries,
    private readonly rpc: AssistantRpc,
    private readonly audit: AuditService,
  ) {}

  /** Every assistant, with their terms (both null until set). */
  async list(): Promise<AssistantTermsRow[]> {
    const [people, rows] = await Promise.all([this.queries.assistants(), this.queries.all()]);
    const byId = new Map(rows.map((r) => [r.assistant_id, r]));
    return people.map((p) => ({ ...toTermsView(p.id, byId.get(p.id) ?? null), name: p.full_name }));
  }

  /** 404 student_not_found. */
  async broughtBy(studentId: string): Promise<BroughtByView> {
    const row = await this.queries.broughtBy(studentId);
    if (!row) throw notFound('student_not_found');
    const assistant = row.brought_by ? { id: row.brought_by, name: row.name ?? '' } : null;
    return { assistant, brought_at: row.brought_at };
  }

  async get(assistantId: string): Promise<AssistantTermsView> {
    if (!(await this.queries.isAssistant(assistantId))) throw notFound('assistant_not_found');
    return toTermsView(assistantId, await this.queries.get(assistantId));
  }

  /**
   * Replaces both parts (null clears one) in one RPC, which refuses a start day in the past for a new part
   * and a start day moved earlier (400 commission_start_in_past / commission_start_earlier / salary_...).
   * Nothing is retroactive: the commission rule only looks at subscriptions fully paid on or after
   * commission.startsOn and the day the student was brought, and each commission keeps the rate it was
   * earned at. Students already brought are evaluated now.
   */
  async set(input: { assistantId: string; terms: AssistantTermsInput; actorId: string }): Promise<AssistantTermsView> {
    const before = await this.get(input.assistantId);
    const columns = termsColumns(input.assistantId, input.terms, input.actorId);
    await this.rpc.setTerms({ assistantId: input.assistantId, columns, actorId: input.actorId });
    const after = toTermsView(input.assistantId, await this.queries.get(input.assistantId));
    await this.audit.record({ actorId: input.actorId, entity: 'assistant_terms', entityId: input.assistantId, action: 'set', before: { ...before }, after: { ...after } });
    if (after.commission) await this.evaluateBrought(input.assistantId);
    return after;
  }

  // ponytail: one RPC per brought student without a commission, sequential; fine for tens of students per assistant.
  private async evaluateBrought(assistantId: string): Promise<void> {
    for (const subscriptionId of await this.queries.uncommissioned(assistantId)) await this.rpc.evaluate(subscriptionId);
  }
}
