import { amountFromStripe, type PaymentAmount, type SalesPaymentView } from '@ab/shared';
import { Injectable } from '@nestjs/common';
import { conflict, forbidden } from '@/common/http/errors';
import { toSalesPayment } from '@/modules/sales/sales-money/sales-money.mapper';
import { SalesMoneyReads } from '@/modules/sales/sales-money/reads/sales-money.reads';
import { SalesMoneyServices } from '@/modules/sales/sales-money/sales-money.services';

/**
 * «تعديل المبلغ» by the assistant (owner 2026-11-02), permission payments.edit_amount (never
 * payments.write): the admin's PaymentsService.update with her as the actor, so the audit
 * (before/after), the package's paid state, the balance, both commissions (the payment triggers)
 * and the alerts follow exactly as on the admin's edit. Any student (the any-student default: no
 * ownership check). A payment only (she records no refund: 403 refund_not_allowed); never a card
 * one, whose amount is Stripe's (409 stripe_amount_locked, before anything is written).
 */
@Injectable()
export class SalesPaymentAmount {
  constructor(
    private readonly services: SalesMoneyServices,
    private readonly reads: SalesMoneyReads,
  ) {}

  async edit(id: string, input: PaymentAmount, actorId: string): Promise<SalesPaymentView> {
    const before = await this.services.payments.get(id); // 404 payment_not_found
    if (amountFromStripe(before.method)) throw conflict('stripe_amount_locked');
    if (before.kind !== 'payment') throw forbidden('refund_not_allowed');
    const view = await this.services.payments.update(id, { amount: input.amount }, actorId);
    return toSalesPayment(view, await this.reads.studentStatus(view.student.id));
  }
}
