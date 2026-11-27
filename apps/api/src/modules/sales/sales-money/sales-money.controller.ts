import { salesPaymentRoutes as payments, salesSubscribeRoutes as routes } from '@ab/shared';
import { uploadMaxBytes } from '@ab/settings';
import { Controller, HttpCode } from '@nestjs/common';
import { ApiBearerAuth } from '@nestjs/swagger';
import { CurrentUser } from '@/common/auth/decorators';
import type { AuthUser } from '@/common/auth/verify-token';
import { asResponse } from '@/common/http/returns';
import { Route, RouteInput, type RouteInputOf } from '@/common/http/route';
import { SalesChatReceipts } from './chat';
import { SalesPackageCancel } from './package-cancel';
import { SalesPaymentAmount } from './payment-edit';
import { SalesMoney } from './sales-money.service';
import { SalesMoneySettings } from './shared';
import { SalesTeacherAssign } from './teacher';

/** New package from a sales chat (R-ASST-01, docs/16 row 16), priced by the API from the catalog */
@ApiBearerAuth()
@Controller()
export class SalesSubscribeController {
  constructor(
    private readonly money: SalesMoney,
    private readonly cancels: SalesPackageCancel,
    private readonly teachers: SalesTeacherAssign,
  ) {}

  @Route(routes.teachers)
  async teacherOptions() {
    return asResponse(routes.teachers.response, await this.teachers.options());
  }

  @Route(routes.quote)
  @HttpCode(200)
  quote(@RouteInput() { body }: RouteInputOf<typeof routes.quote>, @CurrentUser() user: AuthUser) {
    return this.money.quote(body, user);
  }

  /** The teacher is saved once the package exists; a replay assigns again as a no-op. */
  @Route(routes.create)
  async create(
    @RouteInput() { body }: RouteInputOf<typeof routes.create>,
    @CurrentUser() user: AuthUser,
  ) {
    const { teacherId, studentId } = body;
    if (teacherId) await this.teachers.ensureActive(teacherId);
    const view = await this.money.subscribe(body, user);
    if (teacherId) await this.teachers.assign({ studentId, teacherId, actorId: user.id });
    return view;
  }

  @Route(routes.cancel)
  @HttpCode(200)
  cancel(@RouteInput() input: RouteInputOf<typeof routes.cancel>, @CurrentUser() user: AuthUser) {
    return this.cancels.cancel(input.params.id, input.body, user);
  }
}

/** Bank transfer recorded by her counts at once (R-ASST-04); no delete or refund. */
@ApiBearerAuth()
@Controller()
export class SalesPaymentsController {
  constructor(
    private readonly money: SalesMoney,
    private readonly receipts: SalesChatReceipts,
    private readonly settings: SalesMoneySettings,
    private readonly amounts: SalesPaymentAmount,
  ) {}

  @Route(payments.create)
  create(
    @RouteInput() { body }: RouteInputOf<typeof payments.create>,
    @CurrentUser() user: AuthUser,
  ) {
    return this.money.pay(body, user);
  }

  @Route(payments.receiptUploadUrl)
  @HttpCode(200)
  async receiptUploadUrl(
    @RouteInput() { body }: RouteInputOf<typeof payments.receiptUploadUrl>,
    @CurrentUser() user: AuthUser,
  ) {
    return this.money.uploadUrl(body, {
      user,
      maxBytes: uploadMaxBytes(await this.settings.read()),
    });
  }

  @Route(payments.receiptFromChat)
  @HttpCode(200)
  async receiptFromChat(
    @RouteInput() { body }: RouteInputOf<typeof payments.receiptFromChat>,
    @CurrentUser() user: AuthUser,
  ) {
    return this.receipts.copy(body, { user, maxBytes: uploadMaxBytes(await this.settings.read()) });
  }

  @Route(payments.editAmount)
  editAmount(
    @RouteInput() { params, body }: RouteInputOf<typeof payments.editAmount>,
    @CurrentUser() user: AuthUser,
  ) {
    return this.amounts.edit(params.id, body, user);
  }
}
