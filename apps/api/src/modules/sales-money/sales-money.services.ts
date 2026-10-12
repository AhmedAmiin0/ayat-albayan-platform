import { Injectable } from '@nestjs/common';
import { PaymentsService } from '../payments/payments.service';
import { ReceiptsService } from '../payments/receipts.service';
import { SubscriptionCreator } from '../subscriptions/subscription-creator';

/** The admin's money services the salesperson's endpoints reuse unchanged (no duplicated money logic). */
@Injectable()
export class SalesMoneyServices {
  constructor(
    readonly creator: SubscriptionCreator,
    readonly payments: PaymentsService,
    readonly receipts: ReceiptsService,
  ) {}
}
