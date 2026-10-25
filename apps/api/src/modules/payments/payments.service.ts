import type { TablesUpdate } from '@ab/db';
import type { PaymentAttachmentView, PaymentCreate, PaymentUpdate, PaymentView } from '@ab/shared';
import { Injectable } from '@nestjs/common';
import { notFound } from '../../common/http/errors';
import { MoneyWrites } from '../subscriptions/money-writes';
import type { Page } from '../../common/http/http';
import { toPaymentView } from './payments.mapper';
import { PaymentsQueries, type PaymentFilter, type PaymentRow, type PeriodTotal } from './payments.queries';
import { PaymentInputs } from './payment-inputs';
import { precheckPayment, type Prechecked } from './payment-precheck';

/**
 * Manual transfers and refunds recorded by an admin (R-PAY-01, R-MOB-02). Every write is audited, then the
 * package statuses and alerts are recomputed: a full payment turns an unpaid package active.
 */
@Injectable()
export class PaymentsService {
  constructor(
    private readonly payments: PaymentsQueries,
    private readonly inputs: PaymentInputs,
    private readonly writes: MoneyWrites,
  ) {}

  /** P1 plus the filter's totals per currency (net of refunds). */
  async list(f: PaymentFilter): Promise<Page<PaymentView> & { totals: PeriodTotal[] }> {
    const [page, totals] = await Promise.all([this.payments.list(f), this.payments.totals(f)]);
    return { ...page, items: await this.views(page.items), totals };
  }

  async get(id: string): Promise<PaymentView> {
    const [view] = await this.views([await this.row(id)]);
    if (!view) throw notFound('payment_not_found');
    return view;
  }

  /**
   * A retry of the same form (clientRequestId) returns the payment it already recorded, and re-runs its
   * follow-ups (idempotent): a trial → «مشترك» flip lost to a failure after the insert is applied then.
   */
  async create(input: PaymentCreate, actorId: string): Promise<PaymentView> {
    const replay = await this.replayOf(input.clientRequestId);
    if (replay) return this.replayed(replay, input, actorId);
    const sub = await this.receipts.subscription(input.subscriptionId);
    let checked: Prechecked;
    try {
      checked = await precheckPayment({ payments: this.payments, inputs: this.inputs }, { input, sub });
    } catch (e) {
      return this.raced(input, actorId, e); // a racing send of this form may have booked it: replay
    }
    const { files, converted } = checked;
    const row = await this.payments.insert({
      subscription_id: sub.id,
      ...converted,
      kind: input.kind,
      invoice_id: input.invoiceId ?? null,
      method: input.method,
      paid_at: input.paidAt,
      receipt_path: input.receiptPath ?? null,
      recorded_by: actorId,
      note: input.note ?? null,
      client_request_id: input.clientRequestId ?? null,
    });
    if (!row) return this.raced(input, actorId);
    await this.files.saveBooked(row.id, files, actorId); // never throws: before the follow-ups, so none can drop them
    await this.writes.done({ actorId, entity: 'payments', entityId: row.id, action: 'create', after: row }, sub.student_id);
    return this.get(row.id);
  }

  async update(id: string, patch: Partial<PaymentUpdate>, actorId: string): Promise<PaymentView> {
    const before = await this.row(id);
    await this.files.checkPatch(before, patch);
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
    const attached = await this.files.attachments.paths(id); // read first: the rows cascade
    await this.payments.remove(id);
    await this.writes.done({ actorId, entity: 'payments', entityId: id, action: 'delete', before }, studentOf(before));
    await this.receipts.discard(before.receipt_path);
    await this.files.attachments.discard(attached);
  }

  /** «المرفقات»: the legacy receipt first, then the files, each signed for 1 h. */
  async attachments(id: string): Promise<PaymentAttachmentView[]> {
    return this.files.attachments.views(await this.row(id));
  }

  /** P7: the receipt, or the booking invoice it was recorded from. */
  async receipt(id: string) {
    return this.inputs.receipt(await this.row(id));
  }

  /** A replay re-runs the follow-ups first, then saves (best effort) the form's files a failure lost. */
  private async replayed(view: PaymentView, input: PaymentCreate, actorId: string): Promise<PaymentView> {
    const row = await this.row(view.id);
    await this.writes.replayed({ actorId, entity: 'payments', entityId: row.id, action: 'create', after: row }, studentOf(row));
    await this.files.saveLate(row, input, actorId);
    return view;
  }

  /** Another send of the form booked it (lost the insert race, or a pre-insert check refused it just after): replay. */
  private async raced(input: PaymentCreate, actorId: string, failure?: unknown): Promise<PaymentView> {
    const raced = await this.replayOf(input.clientRequestId);
    if (raced) return this.replayed(raced, input, actorId);
    throw failure ?? notFound('payment_not_found');
  }

  private get receipts() {
    return this.inputs.files.receipts;
  }

  private get files() {
    return this.inputs.files;
  }

  private async replayOf(clientRequestId: string | undefined): Promise<PaymentView | null> {
    const row = clientRequestId ? await this.payments.byRequest(clientRequestId) : null;
    return row ? this.get(row.id) : null;
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
