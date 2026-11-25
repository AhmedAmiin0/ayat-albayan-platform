import type { SalesPaymentView } from '@ab/shared';
import { amountFromStripe, type PaymentAmount } from '@ab/money';
import { Injectable } from '@nestjs/common';
import type { AuthUser } from '@/common/auth/verify-token';
import { conflict, forbidden } from '@/common/http/errors';
import { SalesMoneyReads } from '@/modules/sales/sales-money/reads';
import {
  SalesMoneyScope,
  SalesMoneyServices,
  toSalesPayment,
} from '@/modules/sales/sales-money/shared';

/** Reuses the admin's payment update with her as actor; card payment amounts are locked (409). */
@Injectable()
export class SalesPaymentAmount {
  constructor(
    private readonly services: SalesMoneyServices,
    private readonly reads: SalesMoneyReads,
    private readonly scope: SalesMoneyScope,
  ) {}

  async edit(id: string, input: PaymentAmount, user: AuthUser): Promise<SalesPaymentView> {
    const before = await this.services.payments.get(id); // 404 payment_not_found
    await this.scope.assertRenews(user, before.student.id);
    if (amountFromStripe(before.method)) throw conflict('stripe_amount_locked');
    if (before.kind !== 'payment') throw forbidden('refund_not_allowed');
    const view = await this.services.payments.update(id, { amount: input.amount }, user.id);
    return toSalesPayment(view, await this.reads.studentStatus(view.student.id));
  }
}
