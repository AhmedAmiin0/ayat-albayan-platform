import type { Json, Tables } from '@ab/db';
import { Inject, Injectable } from '@nestjs/common';
import { DB, type Db } from '../../common/db/db.module';
import { callRpc } from '../scheduling/rpc';
import { dbError } from '../teachers/http';

export type EarningRow = Tables<'v_teacher_earnings'>;
export type PaymentRow = Tables<'teacher_payments'> & { items: { id: string }[] };
export type TeacherRef = { id: string; display_name_ar: string };

const PAYMENT = '*, items:teacher_payment_items(id)';

/**
 * All supabase access for the per-session ledger (service role; the controllers guard). Reads go
 * through v_teacher_earnings; the ONLY writer is the record_teacher_payment RPC (migration 178).
 */
@Injectable()
export class TeacherEarningsQueries {
  constructor(@Inject(DB) private readonly db: Db) {}

  async teacher(id: string): Promise<TeacherRef | null> {
    const { data, error } = await this.db.from('teachers').select('id, display_name_ar').eq('id', id).maybeSingle();
    if (error) throw dbError(error);
    return data;
  }

  /** Every earning of the teacher, newest session first. */
  async earnings(teacherId: string): Promise<EarningRow[]> {
    const { data, error } = await this.db
      .from('v_teacher_earnings')
      .select('*')
      .eq('teacher_id', teacherId)
      .order('starts_at', { ascending: false });
    if (error) throw dbError(error);
    return data;
  }

  async payments(teacherId: string): Promise<PaymentRow[]> {
    const { data, error } = await this.db
      .from('teacher_payments')
      .select(PAYMENT)
      .eq('teacher_id', teacherId)
      .order('paid_at', { ascending: false });
    if (error) throw dbError(error);
    return data;
  }

  async payment(id: string): Promise<PaymentRow | null> {
    const { data, error } = await this.db.from('teacher_payments').select(PAYMENT).eq('id', id).maybeSingle();
    if (error) throw dbError(error);
    return data;
  }

  /** The payment a form already recorded (rule 8). */
  async byRequest(clientRequestId: string): Promise<PaymentRow | null> {
    const { data, error } = await this.db
      .from('teacher_payments')
      .select(PAYMENT)
      .eq('client_request_id', clientRequestId)
      .maybeSingle();
    if (error) throw dbError(error);
    return data;
  }

  /** One transaction: payment + items + statuses + audit. Raises over_payment / earning_not_found. */
  async record(payload: Record<string, unknown>): Promise<{ payment_id: string; replayed: boolean }> {
    const result = (await callRpc(this.db, 'record_teacher_payment', { p: payload as unknown as Json })) as {
      payment_id: string;
      replayed: boolean;
    };
    return result;
  }
}
