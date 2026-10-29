import { RIYADH_TZ, type AssistantCommissionStatus } from '@ab/shared';
import { Inject, Injectable } from '@nestjs/common';
import { DB, type Db } from '../../../../common/db/db.module';
import { dbError, type PageQuery } from '../../../../common/http/http';
import { MY_COMMISSION_SELECT, type MyCommissionSource } from './my.commissions.mapper';
import { MY_PAYMENT_SELECT, MY_STUDENT_COLUMNS, type MyPaymentSource, type MyStudentSource } from './my.mapper';

export type StatementState = { statement: { status: 'draft' | 'approved' | 'paid' } | null };
export type MyCommission = StatementState & { id: string; amount: number; currency: string; earned_at: string };
/** A commission the wallet counts: earned, or voided but still held by the frozen statement it was paid in. */
export type MyWalletCommission = StatementState & { amount: number; currency: string; earned_at: string; status: AssistantCommissionStatus };
/** kind 'reversal' = a commission voided after its statement was approved or paid (migration 272). */
export type MyAdjustment = StatementState & { id: string; kind: string; amount: number; currency: string; effective_month: string };

/** Cap on the assistant's own payment list (newest first). */
export const MY_PAYMENTS_LIMIT = 500;

/**
 * What the signed-in assistant may read of the money tables (service role). Every method takes the
 * profile id from the login, and every query filters on it: another assistant's rows, and any payment
 * recorded by someone else, never match (rule 9; RLS in migrations 271 and 274 is the second wall).
 */
@Injectable()
export class MyQueries {
  constructor(@Inject(DB) private readonly db: Db) {}

  /** The students this assistant brought, newest first (v_assistant_students). */
  async students(assistantId: string): Promise<MyStudentSource[]> {
    const { data, error } = await this.db
      .from('v_assistant_students')
      .select(MY_STUDENT_COLUMNS)
      .eq('assistant_id', assistantId)
      .order('brought_at', { ascending: false })
      .order('student_id');
    if (error) throw dbError(error);
    return data;
  }

  /** The guardian's phone of each student this assistant brought (student id → E.164), nothing else of the guardian. */
  async guardianPhones(assistantId: string): Promise<Map<string, string>> {
    const { data, error } = await this.db.from('students').select('id, guardian:guardians(phone_e164)').eq('brought_by', assistantId);
    if (error) throw dbError(error);
    return new Map(data.flatMap((s) => (s.guardian?.phone_e164 ? [[s.id, s.guardian.phone_e164] as const] : [])));
  }

  /** ONLY the payments this assistant recorded (recorded_by = self); the subscription is reached for the student's name only. */
  async payments(assistantId: string): Promise<MyPaymentSource[]> {
    const { data, error } = await this.db
      .from('payments')
      .select(MY_PAYMENT_SELECT)
      .eq('recorded_by', assistantId)
      .order('paid_at', { ascending: false })
      .order('id')
      .limit(MY_PAYMENTS_LIMIT)
      .overrideTypes<MyPaymentSource[], { merge: false }>();
    if (error) throw dbError(error);
    return data;
  }

  async tz(assistantId: string): Promise<string> {
    const { data, error } = await this.db.from('profiles').select('tz').eq('id', assistantId).maybeSingle();
    if (error) throw dbError(error);
    // The database's own fallback (assistant_commission_plan, build_assistant_statement): Riyadh.
    return data?.tz ?? RIYADH_TZ;
  }

  /** Earned commissions with the status of the statement each sits in. */
  async commissions(assistantId: string): Promise<MyCommission[]> {
    const { data, error } = await this.db
      .from('assistant_commissions')
      .select('id, amount, currency, earned_at, statement:assistant_statements(status)')
      .eq('assistant_id', assistantId)
      .eq('status', 'earned')
      .overrideTypes<MyCommission[], { merge: false }>();
    if (error) throw dbError(error);
    return data;
  }

  /**
   * «محفظتي»'s commissions: the earned ones, and a voided one still in a statement (only a frozen statement
   * keeps a voided row; its reversal adjustment then takes it back).
   */
  async walletRows(assistantId: string): Promise<MyWalletCommission[]> {
    const { data, error } = await this.db
      .from('assistant_commissions')
      .select('amount, currency, earned_at, status, statement:assistant_statements(status)')
      .eq('assistant_id', assistantId)
      .or('status.eq.earned,statement_id.not.is.null')
      .overrideTypes<MyWalletCommission[], { merge: false }>();
    if (error) throw dbError(error);
    return data;
  }

  /** «عمولاتي»: one page of my commissions (earned and voided), newest first; index (assistant_id, earned_at). */
  async commissionPage(assistantId: string, q: PageQuery): Promise<{ rows: MyCommissionSource[]; total: number }> {
    const from = (q.page - 1) * q.pageSize;
    const { data, count, error } = await this.db
      .from('assistant_commissions')
      .select(MY_COMMISSION_SELECT, { count: 'exact' })
      .eq('assistant_id', assistantId)
      .order('earned_at', { ascending: false })
      .order('id', { ascending: false })
      .range(from, from + q.pageSize - 1)
      .overrideTypes<MyCommissionSource[], { merge: false }>();
    if (error) throw dbError(error);
    return { rows: data, total: count ?? 0 };
  }

  async adjustments(assistantId: string): Promise<MyAdjustment[]> {
    const { data, error } = await this.db
      .from('assistant_adjustments')
      .select('id, kind, amount, currency, effective_month, statement:assistant_statements(status)')
      .eq('assistant_id', assistantId)
      .overrideTypes<MyAdjustment[], { merge: false }>();
    if (error) throw dbError(error);
    return data;
  }
}
