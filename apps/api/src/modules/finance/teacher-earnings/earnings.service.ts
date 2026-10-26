import type { Json } from '@ab/db';
import {
  allocatePayment,
  balanceOf,
  type AllocationError,
  type EarningsListQuery,
  type TeacherEarningsBalanceView,
  type TeacherEarningView,
  type TeacherPaymentCreate,
  type TeacherPaymentListQuery,
  type TeacherPaymentResult,
  type TeacherPaymentView,
} from '@ab/shared';
import { Injectable } from '@nestjs/common';
import { badRequest, conflict, notFound } from '../../../common/http/errors';
import type { Page } from '../../../common/http/http';
import { toEarningView, toPaymentView } from './earnings.mapper';
import { EarningsQueries, type PaymentRow } from './earnings.queries';
import { EarningsReceipts } from './earnings.receipts';

type Pay = { teacherId: string; actorId: string };

/**
 * Per-session teacher earnings (docs/11 §10): the balance cards, the sessions, the payments, and
 * recording a payment against chosen sessions. The ledger rows themselves are written by the
 * database (migration 177); this service only reads them and records payments (migration 178).
 */
@Injectable()
export class EarningsService {
  constructor(
    private readonly queries: EarningsQueries,
    private readonly receipts: EarningsReceipts,
  ) {}

  async balance(teacherId: string): Promise<TeacherEarningsBalanceView> {
    const teacher = await this.queries.teacher(teacherId);
    if (!teacher) throw notFound('teacher_not_found');
    return { ...balanceOf(await this.queries.money(teacherId)), teacher, currency: 'EGP' };
  }

  async sessions(teacherId: string, q: EarningsListQuery): Promise<Page<TeacherEarningView>> {
    const page = await this.queries.sessions(teacherId, q);
    return { ...page, items: page.items.map(toEarningView) };
  }

  async payments(teacherId: string, q: TeacherPaymentListQuery): Promise<Page<TeacherPaymentView>> {
    const page = await this.queries.payments(teacherId, q);
    return { ...page, items: page.items.map(toPaymentView) };
  }

  /**
   * Pays `input.amount` over the ticked sessions (or every unpaid one), oldest lesson first. A
   * retry of the same `clientRequestId` returns the payment already recorded. More than the
   * chosen sessions still owe is 409 `overpayment`; less is a partial payment.
   */
  async record(ctx: Pay, input: TeacherPaymentCreate): Promise<TeacherPaymentResult> {
    const replay = await this.replayOf(ctx.teacherId, input.clientRequestId);
    if (replay) return { payment: replay, replayed: true };
    if (!(await this.queries.teacher(ctx.teacherId))) throw notFound('teacher_not_found');
    if (input.receiptPath) await this.receipts.check(ctx.teacherId, input.receiptPath);
    const ids = input.earningIds ? [...new Set(input.earningIds)] : undefined;
    const earnings = await this.queries.forPayment(ctx.teacherId, ids);
    if (ids && earnings.length !== ids.length) throw notFound('earning_not_found');
    const plan = allocatePayment({ amount: input.amount, earnings });
    if (!plan.ok) throw allocationError(plan.error);
    const result = await this.queries.record(payload(ctx, input, plan.items));
    const payment = await this.queries.payment(result.payment_id);
    if (!payment) throw notFound('payment_not_found');
    return { payment: toPaymentView(payment), replayed: result.replayed };
  }

  /** resync_teacher_earnings: after a rate or a payout_count_* setting changed. */
  resync(teacherId: string | undefined): Promise<number> {
    return this.queries.resync(teacherId);
  }

  async payment(id: string): Promise<TeacherPaymentView> {
    const row = await this.queries.payment(id);
    if (!row) throw notFound('payment_not_found');
    return toPaymentView(row);
  }

  /** A payment's signed receipt URL; `teacherId` set → only if it is that teacher's. */
  async receipt(id: string, teacherId?: string) {
    const row = await this.queries.payment(id);
    if (!row || (teacherId && row.teacher_id !== teacherId)) throw notFound('payment_not_found');
    return this.receipts.download(row.receipt_path);
  }

  private async replayOf(teacherId: string, requestId: string | undefined): Promise<TeacherPaymentView | null> {
    const row: PaymentRow | null = requestId ? await this.queries.byRequest(requestId) : null;
    if (!row) return null;
    if (row.teacher_id !== teacherId) throw conflict('request_reused');
    return toPaymentView(row);
  }
}

function allocationError(error: AllocationError): Error {
  if (error === 'invalid_amount') return badRequest('invalid_amount');
  return conflict(error);
}

function payload(ctx: Pay, input: TeacherPaymentCreate, items: { earning_id: string; amount: number }[]): Json {
  return {
    actor: ctx.actorId,
    teacher_id: ctx.teacherId,
    client_request_id: input.clientRequestId ?? null,
    amount: input.amount,
    method: input.method,
    paid_at: input.paidAt,
    receipt_path: input.receiptPath ?? null,
    note: input.note ?? null,
    items,
  };
}
