import { myPayoutRoutes, payoutRoutes as routes, type SignedDownload } from '@ab/shared';
import type { PayoutGenerateResult, PayoutView } from '@ab/money';
import { Controller, HttpCode } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { CurrentUser, Permissions } from '@/common/auth/decorators';
import type { AuthUser } from '@/common/auth/verify-token';
import { badRequest } from '@/common/http/errors';
import { Route, RouteInput, type RouteInputOf } from '@/common/http/route';
import { PayoutsGenerator } from './payouts.generate';
import { PayoutsLedger } from './payouts.ledger';
import { PayoutsPayment } from './payouts.payment';
import { PayoutsService } from './payouts.service';

type In<K extends keyof typeof routes> = RouteInputOf<(typeof routes)[K]>;

/** Teacher payouts per month (Y1–Y4, R-PAY-02, R-TCH-04). Admin only. CSV: /exports (B4). */
@ApiTags('payouts')
@ApiBearerAuth()
@Permissions('payouts.write')
@Controller()
export class PayoutsController {
  constructor(
    private readonly payouts: PayoutsService,
    private readonly generator: PayoutsGenerator,
    private readonly ledger: PayoutsLedger,
  ) {}

  @Route(routes.month)
  @Permissions('payouts.read')
  async month(@RouteInput() { query }: In<'month'>): Promise<PayoutView[]> {
    return this.ledger.annotate(await this.payouts.month(query.month));
  }

  @Route(routes.generate)
  @HttpCode(200)
  generate(
    @RouteInput({ badParam: () => badRequest('invalid_month') }) { params }: In<'generate'>,
    @CurrentUser() user: AuthUser,
  ): Promise<PayoutGenerateResult> {
    return this.generator.generate(params.month, user.id);
  }

  @Route(routes.approve)
  @HttpCode(200)
  @Permissions('payouts.approve')
  approve(
    @RouteInput() { params }: In<'approve'>,
    @CurrentUser() user: AuthUser,
  ): Promise<PayoutView> {
    return this.payouts.approve(params.id, user.id);
  }

  @Route(routes.reopen)
  @HttpCode(200)
  reopen(@RouteInput() { params }: In<'reopen'>, @CurrentUser() user: AuthUser): Promise<PayoutView> {
    return this.ledger.reopen(params.id, user.id);
  }

  @Route(routes.unpay)
  @HttpCode(200)
  unpay(
    @RouteInput() { params, body }: In<'unpay'>,
    @CurrentUser() user: AuthUser,
  ): Promise<PayoutView> {
    return this.ledger.unpay(params.id, { ...body, actorId: user.id });
  }
}

/** Y4 marks paid with its receipt: settlement and status in one transaction (PayoutsPayment). */
@ApiTags('payouts')
@ApiBearerAuth()
@Permissions('payouts.read')
@Controller()
export class PayoutPaymentController {
  constructor(private readonly payment: PayoutsPayment) {}

  @Route(routes.receipt)
  receipt(@RouteInput() { params }: In<'receipt'>): Promise<SignedDownload> {
    return this.payment.receipt(params.id);
  }

  @Route(routes.pay)
  @HttpCode(200)
  @Permissions('payouts.write')
  pay(@RouteInput() { params, body }: In<'pay'>, @CurrentUser() user: AuthUser): Promise<PayoutView> {
    return this.payment.pay(params.id, body, user.id);
  }
}

/** Y5 GET /teachers/me/payouts?month — the signed-in teacher's own (R-TCH-04). */
@ApiTags('teachers')
@ApiBearerAuth()
@Permissions('self.teacher')
@Controller()
export class TeacherPayoutsController {
  constructor(
    private readonly payouts: PayoutsService,
    private readonly ledger: PayoutsLedger,
  ) {}

  @Route(myPayoutRoutes.mine)
  async mine(
    @RouteInput() { query }: RouteInputOf<typeof myPayoutRoutes.mine>,
    @CurrentUser() user: AuthUser,
  ): Promise<PayoutView[]> {
    return this.ledger.annotate(await this.payouts.mine(user.id, query.month));
  }
}
