import {
  paymentCreateSchema,
  paymentUpdateSchema,
  receiptUploadSchema,
  uploadMaxBytes,
  type PaymentView,
  type SignedDownload,
  type SignedUpload,
} from '@ab/shared';
import { Body, Controller, Delete, Get, HttpCode, Param, ParseUUIDPipe, Patch, Post, Query } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { CurrentUser, Roles } from '../../common/auth/decorators';
import { SettingsService } from '../../common/settings/settings.service';
import type { AuthUser } from '../../common/auth/verify-token';
import { parseOrThrow, sentOnly, type Page } from '../teachers/http';
import { paymentFilter, paymentListQuery } from './payments.dto';
import type { PeriodTotal } from './payments.queries';
import { PaymentsService } from './payments.service';
import { ReceiptsService } from './receipts.service';

/** Payments + receipts (P1–P7, R-PAY-01, R-MOB-02). Admin only. */
@ApiTags('payments')
@ApiBearerAuth()
@Roles('admin')
@Controller('payments')
export class PaymentsController {
  constructor(
    private readonly payments: PaymentsService,
    private readonly receipts: ReceiptsService,
    private readonly settings: SettingsService,
  ) {}

  @Get()
  async list(@Query() query: unknown): Promise<Page<PaymentView> & { totals: PeriodTotal[] }> {
    const { academy_timezone: tz } = await this.settings.all();
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
    return this.receipts.uploadUrl(input, uploadMaxBytes(await this.settings.all()));
  }

  @Get(':id')
  get(@Param('id', ParseUUIDPipe) id: string): Promise<PaymentView> {
    return this.payments.get(id);
  }

  @Get(':id/receipt')
  receipt(@Param('id', ParseUUIDPipe) id: string): Promise<SignedDownload> {
    return this.payments.receipt(id);
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
