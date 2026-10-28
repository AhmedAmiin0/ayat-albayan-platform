import { convertPayment, type PaymentWrite, type SignedDownload } from '@ab/shared';
import { Injectable } from '@nestjs/common';
import { FxService } from '../fx/fx.service';
import { InvoicesService } from '../invoices/invoices.service';
import { badRequest, errorCode } from '../../../common/http/errors';
import type { PaymentRow, PaymentSubscription } from './payments.queries';
import { PaymentFiles } from './attachments/payment-files';
import type { ReceiptsService } from './attachments/receipts.service';

export type Converted = {
  amount: number;
  currency: string;
  original_amount: number | null;
  original_currency: string | null;
  fx_rate: number | null;
};

/**
 * What a payment needs besides its row (owner, 2026-10-05): an amount sent in another currency
 * converted to the package's at the rate in force at paid_at (400 fx_unavailable when there is
 * none), a booking invoice used as the receipt (it must be one of the student's), and its files.
 */
@Injectable()
export class PaymentInputs {
  constructor(
    private readonly fx: FxService,
    private readonly invoices: InvoicesService,
    readonly files: PaymentFiles,
  ) {}

  get receipts(): ReceiptsService {
    return this.files.receipts;
  }

  async convert(input: PaymentWrite, sub: PaymentSubscription): Promise<Converted> {
    if (input.currency === sub.currency)
      return { amount: input.amount, currency: sub.currency, original_amount: null, original_currency: null, fx_rate: null };
    try {
      const [sent, pkg] = await Promise.all([
        this.fx.rateSarAt(input.currency, input.paidAt),
        this.fx.rateSarAt(sub.currency, input.paidAt),
      ]);
      const r = convertPayment({ amount: input.amount, sarToSent: sent.rate, sarToPackage: pkg.rate });
      return { amount: r.amount, currency: sub.currency, original_amount: input.amount, original_currency: input.currency, fx_rate: r.rate };
    } catch (e) {
      if (errorCode(e) === 'fx_unavailable') throw badRequest('fx_unavailable', { currency: input.currency });
      throw e;
    }
  }

  /** 400 invoice_mismatch unless the invoice is a booking of this package's student. */
  async checkInvoice(invoiceId: string, studentId: string): Promise<void> {
    const invoice = await this.invoices.one(invoiceId);
    if (!invoice || !invoice.students.some((s) => s.id === studentId)) throw badRequest('invoice_mismatch');
  }

  /** The payment's receipt; one recorded from an invoice has the invoice as its receipt. */
  receipt(row: PaymentRow): Promise<SignedDownload> {
    if (row.receipt_path === null && row.invoice_id !== null) return this.invoices.download(row.invoice_id);
    return this.receipts.download(row.receipt_path);
  }
}
