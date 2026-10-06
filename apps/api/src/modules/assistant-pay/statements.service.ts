import { monthStart, type AssistantStatementView, type SignedDownload, type SignedUpload, type TeacherReceiptUpload } from '@ab/shared';
import { Injectable } from '@nestjs/common';
import { notFound } from '../scheduling/errors';
import { EarningsReceipts } from '../teacher-earnings/earnings.receipts';
import type { StatementPay as Pay, StatementsQuery as Query } from './assistant-pay.dto';
import { AssistantRpc } from './assistant-pay.rpc';
import { StatementsQueries } from './statements.queries';
import { toStatementView, type StatementRow } from './statements.mapper';

/**
 * An assistant's monthly statement (R-ASST-03): salary + commissions + adjustments per currency, draft ->
 * approved -> paid like teacher payouts. Every change is one RPC (one transaction + audit); a repeat
 * answers 409 invalid_transition, so a double click never moves money twice.
 */
@Injectable()
export class StatementsService {
  constructor(
    private readonly queries: StatementsQueries,
    private readonly rpc: AssistantRpc,
    private readonly receipts: EarningsReceipts,
  ) {}

  async list(q: Query): Promise<AssistantStatementView[]> {
    const rows = await this.queries.list({ assistantId: q.assistantId, month: q.month ? monthStart(q.month) : undefined, status: q.status });
    return rows.map(toStatementView);
  }

  get(id: string): Promise<AssistantStatementView> {
    return this.view(id);
  }

  /** Builds or rebuilds the draft of the month; approved and paid ones answer 409 invalid_transition. */
  async generate(input: { assistantId: string; month: string; actorId: string }): Promise<AssistantStatementView> {
    const id = await this.rpc.generate({ ...input, month: monthStart(input.month) });
    return this.view(id);
  }

  async approve(id: string, actorId: string): Promise<AssistantStatementView> {
    await this.rpc.approve(id, actorId);
    return this.view(id);
  }

  /** approved -> draft. 409 reversal_in_later_statement while a correction of it sits in a later statement. */
  async reopen(id: string, actorId: string): Promise<AssistantStatementView> {
    await this.rpc.reopen(id, actorId);
    return this.view(id);
  }

  async pay(id: string, body: Pay, actorId: string): Promise<AssistantStatementView> {
    const row = await this.row(id);
    if (body.receiptPath) await this.receipts.check(row.assistant_id, body.receiptPath);
    const paid = { paidAt: body.paidAt ?? new Date().toISOString(), method: body.method ?? null, note: body.note ?? null, receiptPath: body.receiptPath ?? null };
    await this.rpc.pay({ statementId: id, actorId, paid });
    return this.view(id);
  }

  async unpay(input: { id: string; reason: string; actorId: string }): Promise<AssistantStatementView> {
    await this.rpc.unpay({ statementId: input.id, actorId: input.actorId, reason: input.reason });
    return this.view(input.id);
  }

  async receipt(id: string): Promise<SignedDownload> {
    return this.receipts.download((await this.row(id)).receipt_path);
  }

  /** receipts/{assistant_id}/{uuid}.{ext}: the folder of the assistant, checked again at pay. */
  uploadUrl(assistantId: string, body: TeacherReceiptUpload): Promise<SignedUpload> {
    return this.receipts.uploadUrl(assistantId, body);
  }

  private async view(id: string): Promise<AssistantStatementView> {
    return toStatementView(await this.row(id));
  }

  private async row(id: string): Promise<StatementRow> {
    const row = await this.queries.get(id);
    if (!row) throw notFound('statement_not_found');
    return row;
  }
}
