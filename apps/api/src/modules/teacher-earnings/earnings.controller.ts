import {
  earningsListQuery,
  teacherPaymentCreateSchema,
  teacherReceiptUploadSchema,
  teacherResyncSchema,
  type SignedDownload,
  type SignedUpload,
  type TeacherEarningsBalanceView,
  type TeacherEarningView,
  type TeacherPaymentResult,
  type TeacherPaymentView,
} from '@ab/shared';
import { Body, Controller, Get, HttpCode, Param, ParseUUIDPipe, Post, Query } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { CurrentUser, Roles } from '../../common/auth/decorators';
import type { AuthUser } from '../../common/auth/verify-token';
import { pageQuerySchema, parseOrThrow, type Page } from '../teachers/http';
import { EarningsQueries } from './earnings.queries';
import { EarningsReceipts } from './earnings.receipts';
import { EarningsService } from './earnings.service';

/** Admin: a teacher's balance, sessions and payments; record a payment (docs/11 §10). */
@ApiTags('teacher-earnings')
@ApiBearerAuth()
@Roles('admin')
@Controller('teacher-earnings')
export class TeacherEarningsController {
  constructor(
    private readonly earnings: EarningsService,
    private readonly receipts: EarningsReceipts,
    private readonly queries: EarningsQueries,
  ) {}

  /** Static segment, declared before `:teacherId`. After a rate or a payout_count_* setting changes. */
  @Post('resync')
  @HttpCode(200)
  async resync(@Body() body: unknown): Promise<{ lessons: number }> {
    const { teacherId } = parseOrThrow(teacherResyncSchema, body ?? {});
    return { lessons: await this.queries.resync(teacherId) };
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
    return this.earnings.payments(teacherId, parseOrThrow(pageQuerySchema, query));
  }

  @Post(':teacherId/payments')
  @HttpCode(200)
  record(
    @Param('teacherId', ParseUUIDPipe) teacherId: string,
    @Body() body: unknown,
    @CurrentUser() user: AuthUser,
  ): Promise<TeacherPaymentResult> {
    return this.earnings.record({ teacherId, actorId: user.id }, parseOrThrow(teacherPaymentCreateSchema, body));
  }

  @Post(':teacherId/receipt-upload-url')
  @HttpCode(200)
  receiptUploadUrl(@Param('teacherId', ParseUUIDPipe) teacherId: string, @Body() body: unknown): Promise<SignedUpload> {
    return this.receipts.uploadUrl(teacherId, parseOrThrow(teacherReceiptUploadSchema, body));
  }
}
