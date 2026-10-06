import type { Json } from '@ab/db';
import { Inject, Injectable } from '@nestjs/common';
import { DB, type Db } from '../../common/db/db.module';
import { assistantError } from './assistant-pay.errors';

export type PaidArgs = { paidAt: string; method: string | null; note: string | null; receiptPath: string | null };

const field = (data: Json, key: string): unknown =>
  typeof data === 'object' && data !== null && !Array.isArray(data) ? data[key] : undefined;

/**
 * The RPCs of migrations 20261006000272 / 273 (service role only; each is one transaction with its audit
 * row). P0001 messages become the API error codes (assistantError). The statements' flow is the teacher
 * payouts': generate (draft) -> approve -> pay, with reopen and unpay going back.
 */
@Injectable()
export class AssistantRpc {
  constructor(@Inject(DB) private readonly db: Db) {}

  /** Builds or rebuilds the DRAFT of `month` (YYYY-MM-01); returns the statement id. */
  async generate(input: { assistantId: string; month: string; actorId: string }): Promise<string> {
    const { data, error } = await this.db.rpc('generate_assistant_statement', {
      p_assistant: input.assistantId,
      p_month: input.month,
      p_actor: input.actorId,
    });
    if (error) throw assistantError(error);
    return String(field(data, 'statement_id'));
  }

  async approve(statementId: string, actorId: string): Promise<void> {
    const { error } = await this.db.rpc('approve_assistant_statement', { p_statement: statementId, p_actor: actorId });
    if (error) throw assistantError(error);
  }

  async reopen(statementId: string, actorId: string): Promise<void> {
    const { error } = await this.db.rpc('reopen_assistant_statement', { p_statement: statementId, p_actor: actorId });
    if (error) throw assistantError(error);
  }

  async pay(input: { statementId: string; actorId: string; paid: PaidArgs }): Promise<void> {
    const { paid } = input;
    const p: Json = { paid_at: paid.paidAt, method: paid.method, note: paid.note, receipt_path: paid.receiptPath };
    const { error } = await this.db.rpc('pay_assistant_statement', { p_statement: input.statementId, p_actor: input.actorId, p });
    if (error) throw assistantError(error);
  }

  async unpay(input: { statementId: string; actorId: string; reason: string }): Promise<void> {
    const { error } = await this.db.rpc('unpay_assistant_statement', {
      p_statement: input.statementId,
      p_actor: input.actorId,
      p_reason: input.reason,
    });
    if (error) throw assistantError(error);
  }

  async adjust(input: { assistantId: string; amount: number; currency: string; reason: string; actorId: string }): Promise<string> {
    const { data, error } = await this.db.rpc('add_assistant_adjustment', {
      p_assistant: input.assistantId,
      p_amount: input.amount,
      p_currency: input.currency,
      p_reason: input.reason,
      p_actor: input.actorId,
    });
    if (error) throw assistantError(error);
    return data;
  }

  async voidCommission(input: { commissionId: string; actorId: string; reason: string }): Promise<void> {
    const { error } = await this.db.rpc('void_assistant_commission', {
      p_commission: input.commissionId,
      p_actor: input.actorId,
      p_reason: input.reason,
    });
    if (error) throw assistantError(error);
  }

  /** Attribution of one or many students (null clears it); the commission is evaluated after. Returns how many changed. */
  async broughtBy(input: { studentIds: string[]; assistantId: string | null; actorId: string; broughtAt?: string }): Promise<number> {
    const { data, error } = await this.db.rpc('set_students_brought_by', {
      p_students: input.studentIds,
      p_assistant: input.assistantId,
      p_actor: input.actorId,
      ...(input.broughtAt ? { p_brought_at: input.broughtAt } : {}),
    });
    if (error) throw assistantError(error);
    return Number(field(data, 'changed') ?? 0);
  }

  /** Runs the commission rule for the student of this subscription (safe to repeat: one commission per student). */
  async evaluate(subscriptionId: string): Promise<void> {
    const { error } = await this.db.rpc('evaluate_assistant_commission', { p_subscription: subscriptionId });
    if (error) throw assistantError(error);
  }
}
