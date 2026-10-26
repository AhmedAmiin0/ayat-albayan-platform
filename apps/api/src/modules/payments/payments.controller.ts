import {
  paymentCreateSchema,
  paymentUpdateSchema,
  receiptUploadSchema,
  uploadMaxBytes,
  type PaymentAttachmentView,
  type PaymentView,
  type SignedDownload,
  type SignedUpload,
} from '@ab/shared';
import { Body, Controller, Delete, Get, HttpCode, Param, ParseUUIDPipe, Patch, Post, Query } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { CurrentUser, Permissions } from '../../common/auth/decorators';
import type { AuthUser } from '../../common/auth/verify-token';
import { parseOrThrow, sentOnly, type Page } from '../../common/http/http';
import { paymentFilter, paymentListQuery } from './payments.dto';
import type { PeriodTotal } from './payments.queries';
import { PaymentsService } from './payments.service';
import { PaymentsSettings } from './payments.settings';
import { ReceiptsService } from './attachments/receipts.service';

/** Payments + receipts (P1–P7, R-PAY-01, R-MOB-02). Admin only. */
@ApiTags('payments')
@ApiBearerAuth()
@Permissions('payments.write')
@Controller('payments')
export class PaymentsController {
  constructor(
    private readonly payments: PaymentsService,
    private readonly receipts: ReceiptsService,
    private readonly settings: PaymentsSettings,
  ) {}

  @Get()
  @Permissions('payments.read')
  async list(@Query() query: unknown): Promise<Page<PaymentView> & { totals: PeriodTotal[] }> {
    const { academy_timezone: tz } = await this.settings.read();
    return this.payments.list(paymentFilter(parseOrThrow(paymentListQuery, query), tz));
  }

  @Post()
  create(@Body() body: unknown, @CurrentUser() user: AuthUser): Promise<PaymentView> {
    return this.payments.create(parseOrThrow(paymentCreateSchema, body), user.id);
  }

  /** Static segment, declared before `:id`. */
  @Post('receipt-upload-url')
  @HttpCode(200)
  async receiptUploadUrl(@Body() body: unknown): Promise<SignedUpload> {
    const input = parseOrThrow(receiptUploadSchema, body);
    return this.receipts.uploadUrl(input, uploadMaxBytes(await this.settings.read()));
  }

  @Get(':id')
  @Permissions('payments.read')
  get(@Param('id', ParseUUIDPipe) id: string): Promise<PaymentView> {
    return this.payments.get(id);
  }

  @Get(':id/receipt')
  @Permissions('payments.read')
  receipt(@Param('id', ParseUUIDPipe) id: string): Promise<SignedDownload> {
    return this.payments.receipt(id);
  }

  /** «المرفقات»: the legacy receipt first (id 'receipt'), then the files; signed for 1 h. */
  @Get(':id/attachments')
  @Permissions('payments.read')
  attachments(@Param('id', ParseUUIDPipe) id: string): Promise<PaymentAttachmentView[]> {
    return this.payments.attachments(id);
  }

  @Patch(':id')
  update(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() body: unknown,
    @CurrentUser() user: AuthUser,
  ): Promise<PaymentView> {
    return this.payments.update(id, sentOnly(parseOrThrow(paymentUpdateSchema, body), body), user.id);
  }

  @Delete(':id')
  @HttpCode(204)
  async remove(@Param('id', ParseUUIDPipe) id: string, @CurrentUser() user: AuthUser): Promise<void> {
    await this.payments.remove(id, user.id);
  }
}
