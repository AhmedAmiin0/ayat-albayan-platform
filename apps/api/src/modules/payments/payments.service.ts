import type { TablesUpdate } from '@ab/db';
import type { PaymentCreate, PaymentUpdate, PaymentView } from '@ab/shared';
import { Injectable } from '@nestjs/common';
import { badRequest, notFound } from '../scheduling/errors';
import { MoneyWrites } from '../subscriptions/money-writes';
import type { Page } from '../teachers/http';
import { toPaymentView } from './payments.mapper';
import { PaymentsQueries, type PaymentFilter, type PaymentRow } from './payments.queries';
import { ReceiptsService } from './receipts.service';

/**
 * Manual transfers recorded by an admin (R-PAY-01, R-MOB-02). Every write is audited, then the
 * package statuses and alerts are recomputed: a full payment turns an unpaid package active.
 */
@Injectable()
export class PaymentsService {
  constructor(
    private readonly payments: PaymentsQueries,
    private readonly receipts: ReceiptsService,
    private readonly writes: MoneyWrites,
  ) {}

  async list(f: PaymentFilter): Promise<Page<PaymentView>> {
    const page = await this.payments.list(f);
    return { ...page, items: await this.views(page.items) };
  }

  async get(id: string): Promise<PaymentView> {
    const [view] = await this.views([await this.row(id)]);
    if (!view) throw notFound('payment_not_found');
    return view;
  }

  async create(input: PaymentCreate, actorId: string): Promise<PaymentView> {
    const sub = await this.receipts.subscription(input.subscriptionId);
    // TODO(R-PAY-01) owner: payments in another currency than the package's.
    if (input.currency !== sub.currency) throw badRequest('currency_mismatch', { currency: sub.currency });
    if (input.receiptPath) await this.receipts.check(sub.id, input.receiptPath);
    const row = await this.payments.insert({
      subscription_id: sub.id,
      amount: input.amount,
      currency: input.currency,
      method: input.method,
      paid_at: input.paidAt,
      receipt_path: input.receiptPath ?? null,
      recorded_by: actorId,
      note: input.note ?? null,
    });
    await this.writes.done({ actorId, entity: 'payments', entityId: row.id, action: 'create', after: row }, sub.student_id);
    return this.get(row.id);
  }

  async update(id: string, patch: Partial<PaymentUpdate>, actorId: string): Promise<PaymentView> {
    const before = await this.row(id);
    if (patch.receiptPath) await this.receipts.check(before.subscription_id, patch.receiptPath);
    const write: TablesUpdate<'payments'> = {};
    if (patch.amount !== undefined) write.amount = patch.amount;
    if (patch.method !== undefined) write.method = patch.method;
    if (patch.paidAt !== undefined) write.paid_at = patch.paidAt;
    if (patch.receiptPath !== undefined) write.receipt_path = patch.receiptPath;
    if (patch.note !== undefined) write.note = patch.note;
    const after = Object.keys(write).length > 0 ? await this.payments.update(id, write) : before;
    const audit = { actorId, entity: 'payments', entityId: id, action: 'update', before, after };
    await this.writes.done(audit, studentOf(before));
    if (patch.receiptPath !== undefined && before.receipt_path !== patch.receiptPath)
      await this.receipts.discard(before.receipt_path);
    return this.get(id);
  }

  async remove(id: string, actorId: string): Promise<void> {
    const before = await this.row(id);
    await this.payments.remove(id);
    await this.writes.done({ actorId, entity: 'payments', entityId: id, action: 'delete', before }, studentOf(before));
    await this.receipts.discard(before.receipt_path);
  }

  /** P7. */
  async receipt(id: string) {
    return this.receipts.download((await this.row(id)).receipt_path);
  }

  private async row(id: string): Promise<PaymentRow> {
    const row = await this.payments.get(id);
    if (!row) throw notFound('payment_not_found');
    return row;
  }

  private async views(rows: readonly PaymentRow[]): Promise<PaymentView[]> {
    const recorders = await this.payments.recorders(rows.map((r) => r.recorded_by));
    return rows.map((r) => toPaymentView(r, recorders));
  }
}

const studentOf = (row: PaymentRow): string | null => row.subscription?.student_id ?? null;
