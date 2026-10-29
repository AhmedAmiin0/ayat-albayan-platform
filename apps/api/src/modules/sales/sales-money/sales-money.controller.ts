import {
  salesChatReceiptCopySchema,
  salesPaymentCreateSchema,
  salesQuoteSchema,
  salesReceiptUploadSchema,
  salesSubscriptionCreateSchema,
  subscriptionCancelSchema,
  uploadMaxBytes,
  type SalesMoneySubscriptionView,
  type SalesPaymentView,
  type SalesQuoteView,
  type SalesReceiptCopied,
  type SalesTeacherOption,
  type SignedUpload,
} from '@ab/shared';
import { Body, Controller, Get, HttpCode, Param, ParseUUIDPipe, Post } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { CurrentUser, Permissions } from '../../../common/auth/decorators';
import type { AuthUser } from '../../../common/auth/verify-token';
import { parseOrThrow } from '../../../common/http/http';
import { SalesChatReceipts } from './chat/sales-chat-receipts.service';
import { SalesMoney } from './sales-money.service';
import { SalesPackageCancel } from './sales-package-cancel';
import { SalesMoneySettings } from './sales-money.settings';
import { SalesTeacherAssign } from './teacher/sales-teacher-assign';

/**
 * «اشتراك جديد» from a sales chat (owner 2026-10-12, R-ASST-01, docs/16 row 16): the price of the package
 * she is creating (she tells the family how much to transfer), then the package itself, priced by the API
 * from the catalog like the admin's. 403 not_your_student for a student she does not own.
 */
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

  /** «المعلم/ة»'s choices (owner 2026-10-29): the active teachers, names only. */
  @Get('teachers')
  teacherOptions(): Promise<SalesTeacherOption[]> {
    return this.teachers.options();
  }

  @Post('quote')
  @HttpCode(200)
  quote(@Body() body: unknown, @CurrentUser() user: AuthUser): Promise<SalesQuoteView> {
    return this.money.quote(parseOrThrow(salesQuoteSchema, body), user);
  }

  /**
   * «المعلم/ة» (teacherId, owner 2026-10-29) is saved to students.teacher_id once the package exists (the
   * ownership was checked by subscribe; a replay assigns again, a no-op): the student channel opens when
   * the student is subscribed and has that teacher.
   */
  @Post()
  async create(@Body() body: unknown, @CurrentUser() user: AuthUser): Promise<SalesMoneySubscriptionView> {
    const input = parseOrThrow(salesSubscriptionCreateSchema, body);
    const view = await this.money.subscribe(input, user);
    if (input.teacherId) await this.teachers.assign({ studentId: input.studentId, teacherId: input.teacherId, actorId: user.id });
    return view;
  }

  /** «إلغاء الباقة» of her student's package (owner 2026-10-28): the admin's rules, her whitelisted view. */
  @Post(':id/cancel')
  @HttpCode(200)
  cancel(@Param('id', ParseUUIDPipe) id: string, @Body() body: unknown, @CurrentUser() user: AuthUser): Promise<SalesMoneySubscriptionView> {
    return this.cancels.cancel(id, parseOrThrow(subscriptionCancelSchema, body ?? {}), user);
  }
}

/**
 * «سجّل التحويل البنكي» (owner 2026-10-12, R-ASST-04): the family's bank transfer with its receipt, recorded
 * by her and counted at once (a trial student becomes «مشترك»). No edit, no delete, no refund: the admin
 * corrects a wrong payment with the admin tools.
 */
@ApiTags('sales')
@ApiBearerAuth()
@Permissions('self.sales_money')
@Controller('sales/payments')
export class SalesPaymentsController {
  constructor(
    private readonly money: SalesMoney,
    private readonly receipts: SalesChatReceipts,
    private readonly settings: SalesMoneySettings,
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

  /** «اختر صورة الإيصال من المحادثة»: the chosen chat image / PDF copied server-side into receipts. */
  @Post('receipt-from-chat')
  @HttpCode(200)
  async receiptFromChat(@Body() body: unknown, @CurrentUser() user: AuthUser): Promise<SalesReceiptCopied> {
    const input = parseOrThrow(salesChatReceiptCopySchema, body);
    return this.receipts.copy(input, { user, maxBytes: uploadMaxBytes(await this.settings.read()) });
  }
}
