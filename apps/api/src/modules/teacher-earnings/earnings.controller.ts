import {
  earningsListQuery,
  teacherPaymentListQuery,
  teacherPaymentCreateSchema,
  teacherReceiptUploadSchema,
  teacherResyncSchema,
  voidReasonSchema,
  type SignedDownload,
  type SignedUpload,
  type TeacherEarningsBalanceView,
  type TeacherEarningsSummaryView,
  type TeacherEarningView,
  type TeacherPaymentResult,
  type TeacherPaymentView,
} from '@ab/shared';
import { Body, Controller, Get, HttpCode, Param, ParseUUIDPipe, Post, Query } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { CurrentUser, Permissions } from '../../common/auth/decorators';
import type { AuthUser } from '../../common/auth/verify-token';
import { parseOrThrow, type Page } from '../../common/http/http';
import { CorrectionsQueries } from './summary/corrections.queries';
import { EarningsReceipts } from './earnings.receipts';
import { EarningsService } from './earnings.service';
import { toSummaryView } from './summary/earnings.summary';

/** Admin: a teacher's balance, sessions and payments; record a payment (docs/11 §10). */
@ApiTags('teacher-earnings')
@ApiBearerAuth()
@Permissions('earnings.read')
@Controller('teacher-earnings')
export class TeacherEarningsController {
  constructor(
    private readonly earnings: EarningsService,
    private readonly receipts: EarningsReceipts,
    private readonly corrections: CorrectionsQueries,
  ) {}

  /** «مستحقات المعلمين»: earned / paid / owed per teacher (static segment, before `:teacherId`). */
  @Get('summary')
  async summary(): Promise<TeacherEarningsSummaryView> {
    return toSummaryView(await this.corrections.summary());
  }

  /** Static segment, declared before `:teacherId`. After a rate or a payout_count_* setting changes. */
  @Post('resync')
  @HttpCode(200)
  @Permissions('earnings.write')
  async resync(@Body() body: unknown): Promise<{ lessons: number }> {
    const { teacherId } = parseOrThrow(teacherResyncSchema, body ?? {});
    return { lessons: await this.earnings.resync(teacherId) };
  }

  /** A wrong transfer is voided with a reason (never deleted); its sessions are owed again. */
  @Post('payments/:id/void')
  @HttpCode(200)
  @Permissions('earnings.write')
  async void(@Param('id', ParseUUIDPipe) id: string, @Body() body: unknown, @CurrentUser() user: AuthUser) {
    const { reason } = parseOrThrow(voidReasonSchema, body ?? {});
    await this.corrections.voidPayment({ paymentId: id, actorId: user.id, reason });
    return this.earnings.payment(id);
  }

  @Get('payments/:id/receipt')
  receipt(@Param('id', ParseUUIDPipe) id: string): Promise<SignedDownload> {
    return this.earnings.receipt(id);
  }

  @Get(':teacherId')
  balance(@Param('teacherId', ParseUUIDPipe) teacherId: string): Promise<TeacherEarningsBalanceView> {
    return this.earnings.balance(teacherId);
  }

  @Get(':teacherId/sessions')
  sessions(@Param('teacherId', ParseUUIDPipe) teacherId: string, @Query() query: unknown): Promise<Page<TeacherEarningView>> {
    return this.earnings.sessions(teacherId, parseOrThrow(earningsListQuery, query));
  }

  @Get(':teacherId/payments')
  payments(@Param('teacherId', ParseUUIDPipe) teacherId: string, @Query() query: unknown): Promise<Page<TeacherPaymentView>> {
    return this.earnings.payments(teacherId, parseOrThrow(teacherPaymentListQuery, query));
  }

  @Post(':teacherId/payments')
  @HttpCode(200)
  @Permissions('earnings.write')
  record(
    @Param('teacherId', ParseUUIDPipe) teacherId: string,
    @Body() body: unknown,
    @CurrentUser() user: AuthUser,
  ): Promise<TeacherPaymentResult> {
    return this.earnings.record({ teacherId, actorId: user.id }, parseOrThrow(teacherPaymentCreateSchema, body));
  }

  @Post(':teacherId/receipt-upload-url')
  @HttpCode(200)
  @Permissions('earnings.write')
  receiptUploadUrl(@Param('teacherId', ParseUUIDPipe) teacherId: string, @Body() body: unknown): Promise<SignedUpload> {
    return this.receipts.uploadUrl(teacherId, parseOrThrow(teacherReceiptUploadSchema, body));
  }
}
