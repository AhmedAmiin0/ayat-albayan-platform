import { Inject, Injectable } from '@nestjs/common';
import { DB, type Db } from '../../common/db/db.module';
import { dbError } from '../teachers/http';
import { MY_PAYMENT_SELECT, MY_STUDENT_COLUMNS, type MyPaymentSource, type MyStudentSource } from './my.mapper';

export type StatementState = { statement: { status: 'draft' | 'approved' | 'paid' } | null };
export type MyCommission = StatementState & { id: string; amount: number; currency: string; earned_at: string };
export type MyAdjustment = StatementState & { id: string; amount: number; currency: string; effective_month: string };

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
    return data?.tz ?? 'UTC';
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

  async adjustments(assistantId: string): Promise<MyAdjustment[]> {
    const { data, error } = await this.db
      .from('assistant_adjustments')
      .select('id, amount, currency, effective_month, statement:assistant_statements(status)')
      .eq('assistant_id', assistantId)
      .overrideTypes<MyAdjustment[], { merge: false }>();
    if (error) throw dbError(error);
    return data;
  }
}
