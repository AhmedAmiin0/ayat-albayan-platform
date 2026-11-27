import {
  salesChatReceiptCopySchema,
  salesPaymentCreateSchema,
  salesReceiptUploadSchema,
  salesSubscribeRoutes as routes,
  type SalesPaymentView,
  type SalesReceiptCopied,
  type SignedUpload,
} from '@ab/shared';
import { paymentAmountSchema, type PaymentAmount } from '@ab/money';
import { uploadMaxBytes } from '@ab/settings';
import { Body, Controller, HttpCode, Patch, Post } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { CurrentUser, Permissions } from '@/common/auth/decorators';
import type { AuthUser } from '@/common/auth/verify-token';
import { parseOrThrow } from '@/common/http/http';
import { asResponse } from '@/common/http/returns';
import { Route, RouteInput, type RouteInputOf } from '@/common/http/route';
import { SalesChatReceipts } from './chat';
import { SalesPackageCancel } from './package-cancel';
import { SalesPaymentAmount } from './payment-edit';
import { SalesMoney } from './sales-money.service';
import { SalesMoneySettings } from './shared';
import { SalesTeacherAssign } from './teacher';
import { ZodBody, ZodParam } from '@/common/http/zod-inputs';
import { z } from 'zod';

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
@ApiTags('sales')
@ApiBearerAuth()
@Permissions('self.sales_money')
@Controller('sales/payments')
export class SalesPaymentsController {
  constructor(
    private readonly money: SalesMoney,
    private readonly receipts: SalesChatReceipts,
    private readonly settings: SalesMoneySettings,
    private readonly amounts: SalesPaymentAmount,
  ) {}

  @Post()
  create(@Body() body: unknown, @CurrentUser() user: AuthUser): Promise<SalesPaymentView> {
    return this.money.pay(parseOrThrow(salesPaymentCreateSchema, body), user);
  }

  /** A signed PUT for receipts/{subscription_id}/{uuid}.{ext} (a photo or a file she uploads). */
  @Post('receipt-upload-url')
  @HttpCode(200)
  async receiptUploadUrl(@Body() body: unknown, @CurrentUser() user: AuthUser): Promise<SignedUpload> {
    const input = parseOrThrow(salesReceiptUploadSchema, body);
    return this.money.uploadUrl(input, { user, maxBytes: uploadMaxBytes(await this.settings.read()) });
  }

  @Post('receipt-from-chat')
  @HttpCode(200)
  async receiptFromChat(@Body() body: unknown, @CurrentUser() user: AuthUser): Promise<SalesReceiptCopied> {
    const input = parseOrThrow(salesChatReceiptCopySchema, body);
    return this.receipts.copy(input, { user, maxBytes: uploadMaxBytes(await this.settings.read()) });
  }

  /** Needs subscriptions.edit_terms, never payments.write. */
  @Patch(':id/amount')
  @Permissions('subscriptions.edit_terms')
  editAmount(
    @ZodParam('id', z.uuid()) id: string,
    @ZodBody(paymentAmountSchema) body: PaymentAmount,
    @CurrentUser() user: AuthUser,
  ): Promise<SalesPaymentView> {
    return this.amounts.edit(id, body, user);
  }
}
