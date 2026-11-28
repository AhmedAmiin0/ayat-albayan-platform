import {
  salesChatReceiptCopySchema,
  salesPaymentCreateSchema,
  salesQuoteSchema,
  salesReceiptUploadSchema,
  salesSubscriptionCreateSchema,
  type SalesMoneySubscriptionView,
  type SalesPaymentView,
  type SalesQuoteView,
  type SalesReceiptCopied,
  type SalesTeacherOption,
  type SignedUpload,
} from '@ab/shared';
import { paymentAmountSchema, type PaymentAmount, subscriptionCancelSchema } from '@ab/money';
import { uploadMaxBytes } from '@ab/settings';
import { Body, Controller, Get, HttpCode, Param, ParseUUIDPipe, Patch, Post } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { CurrentUser, Permissions } from '@/common/auth/decorators';
import type { AuthUser } from '@/common/auth/verify-token';
import { parseOrThrow } from '@/common/http/http';
import { SalesChatReceipts } from './chat';
import { SalesPackageCancel } from './package-cancel';
import { SalesPaymentAmount } from './payment-edit';
import { SalesMoney } from './sales-money.service';
import { SalesMoneySettings } from './shared';
import { SalesTeacherAssign } from './teacher';
import { ZodBody, ZodParam } from '@/common/http/zod-inputs';
import { z } from 'zod';

/** New package from a sales chat (R-ASST-01, docs/16 row 16), priced by the API from the catalog */
@ApiTags('sales')
@ApiBearerAuth()
@Permissions('self.sales_money')
@Controller('sales/subscriptions')
export class SalesSubscribeController {
  constructor(
    private readonly money: SalesMoney,
    private readonly cancels: SalesPackageCancel,
    private readonly teachers: SalesTeacherAssign,
  ) {}

  @Get('teachers')
  teacherOptions(): Promise<SalesTeacherOption[]> {
    return this.teachers.options();
  }

  @Post('quote')
  @HttpCode(200)
  quote(@Body() body: unknown, @CurrentUser() user: AuthUser): Promise<SalesQuoteView> {
    return this.money.quote(parseOrThrow(salesQuoteSchema, body), user);
  }

  /** The teacher is saved once the package exists; a replay assigns again as a no-op. */
  @Post()
  async create(
    @Body() body: unknown,
    @CurrentUser() user: AuthUser,
  ): Promise<SalesMoneySubscriptionView> {
    const input = parseOrThrow(salesSubscriptionCreateSchema, body);
    if (input.teacherId) await this.teachers.ensureActive(input.teacherId);
    const view = await this.money.subscribe(input, user);
    if (input.teacherId)
      await this.teachers.assign({
        studentId: input.studentId,
        teacherId: input.teacherId,
        actorId: user.id,
      });
    return view;
  }

  @Post(':id/cancel')
  @HttpCode(200)
  cancel(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() body: unknown,
    @CurrentUser() user: AuthUser,
  ): Promise<SalesMoneySubscriptionView> {
    return this.cancels.cancel(id, parseOrThrow(subscriptionCancelSchema, body ?? {}), user);
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
  async receiptUploadUrl(
    @Body() body: unknown,
    @CurrentUser() user: AuthUser,
  ): Promise<SignedUpload> {
    const input = parseOrThrow(salesReceiptUploadSchema, body);
    return this.money.uploadUrl(input, {
      user,
      maxBytes: uploadMaxBytes(await this.settings.read()),
    });
  }

  @Post('receipt-from-chat')
  @HttpCode(200)
  async receiptFromChat(
    @Body() body: unknown,
    @CurrentUser() user: AuthUser,
  ): Promise<SalesReceiptCopied> {
    const input = parseOrThrow(salesChatReceiptCopySchema, body);
    return this.receipts.copy(input, {
      user,
      maxBytes: uploadMaxBytes(await this.settings.read()),
    });
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
