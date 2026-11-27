import { mySalesRoutes as routes } from '@ab/shared';
import type { Page } from '@ab/core';
import type {
  MyCommissionRow,
  MyEarnings,
  MyPaymentRow,
  MyStudentRow,
  PaymentAttachmentView,
} from '@ab/money';
import { Controller } from '@nestjs/common';
import { ApiBearerAuth } from '@nestjs/swagger';
import { CurrentUser } from '@/common/auth/decorators';
import type { AuthUser } from '@/common/auth/verify-token';
import { Route, RouteInput, type RouteInputOf } from '@/common/http/route';
import { PaymentAttachments } from '@/modules/finance/payments/attachments/payment-attachments.service';
import { MyService } from './my.service';

type In<K extends keyof typeof routes> = RouteInputOf<(typeof routes)[K]>;

/**
 * The assistant's own pages (R-ASST-04, R-ASST-06): the students they brought, their earnings and the
 * payments they recorded. Read-only, each behind its own scope key; nobody but the sales base role holds them.
 */
@ApiBearerAuth()
@Controller()
export class MyController {
  constructor(
    private readonly my: MyService,
    private readonly attachments: PaymentAttachments,
  ) {}

  @Route(routes.students)
  students(@CurrentUser() user: AuthUser): Promise<MyStudentRow[]> {
    return this.my.students(user);
  }

  @Route(routes.earnings)
  earnings(@CurrentUser() user: AuthUser): Promise<MyEarnings> {
    return this.my.earnings(user);
  }

  /** Always the caller's own, whatever the query. */
  @Route(routes.commissions)
  commissions(
    @RouteInput() { query }: In<'commissions'>,
    @CurrentUser() user: AuthUser,
  ): Promise<Page<MyCommissionRow>> {
    return this.my.commissions(user, query);
  }

  @Route(routes.payments)
  payments(@CurrentUser() user: AuthUser): Promise<MyPaymentRow[]> {
    return this.my.payments(user);
  }

  @Route(routes.paymentAttachments)
  paymentAttachments(
    @RouteInput() { params }: In<'paymentAttachments'>,
    @CurrentUser() user: AuthUser,
  ): Promise<PaymentAttachmentView[]> {
    return this.attachments.ownViews(params.id, user.id);
  }
}
