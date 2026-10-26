import { Injectable } from '@nestjs/common';
import { PaymentsService } from '../../finance/payments/payments.service';
import { ReceiptsService } from '../../finance/payments/attachments/receipts.service';
import { SubscriptionCreator } from '../../finance/subscriptions/subscription-creator';

/** The admin's money services the salesperson's endpoints reuse unchanged (no duplicated money logic). */
@Injectable()
export class SalesMoneyServices {
  constructor(
    readonly creator: SubscriptionCreator,
    readonly payments: PaymentsService,
    readonly receipts: ReceiptsService,
  ) {}
}
