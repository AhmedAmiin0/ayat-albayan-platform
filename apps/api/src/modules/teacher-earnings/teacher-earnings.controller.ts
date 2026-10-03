import {
  teacherPaymentCreateSchema,
  teacherReceiptUploadSchema,
  type SignedDownload,
  type SignedUpload,
  type TeacherEarningsView,
  type TeacherPaymentView,
} from '@ab/shared';
import { Body, Controller, Get, HttpCode, Param, ParseUUIDPipe, Post } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { CurrentUser, Roles } from '../../common/auth/decorators';
import type { AuthUser } from '../../common/auth/verify-token';
import { parseOrThrow } from '../teachers/http';
import { TeacherEarningsService } from './teacher-earnings.service';

/** مستحقات المعلم — admin: balance, sessions, record a payment, receipts (docs/11 §8b). */
@ApiTags('teacher-earnings')
@ApiBearerAuth()
@Roles('admin')
@Controller('teachers/:id/earnings')
export class TeacherEarningsController {
  constructor(private readonly earnings: TeacherEarningsService) {}

  @Get()
  view(@Param('id', ParseUUIDPipe) id: string): Promise<TeacherEarningsView> {
    return this.earnings.view(id);
  }

  @Get('payments')
  payments(@Param('id', ParseUUIDPipe) id: string): Promise<TeacherPaymentView[]> {
    return this.earnings.payments(id);
  }

  @Post('payments')
  pay(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() body: unknown,
    @CurrentUser() user: AuthUser,
  ): Promise<TeacherPaymentView> {
    return this.earnings.pay(id, parseOrThrow(teacherPaymentCreateSchema, body), user.id);
  }

  @Post('receipt-upload-url')
  @HttpCode(200)
  uploadUrl(@Param('id', ParseUUIDPipe) id: string, @Body() body: unknown): Promise<SignedUpload> {
    return this.earnings.uploadUrl(id, parseOrThrow(teacherReceiptUploadSchema, body));
  }

  @Get('payments/:paymentId/receipt')
  receipt(
    @Param('id', ParseUUIDPipe) id: string,
    @Param('paymentId', ParseUUIDPipe) paymentId: string,
  ): Promise<SignedDownload> {
    return this.earnings.receipt(id, paymentId);
  }
}

/** مستحقاتي — the signed-in teacher reads only her own (the static `teachers/me` wins over `:id`). */
@ApiTags('teacher-earnings')
@ApiBearerAuth()
@Roles('teacher')
@Controller('teachers/me/earnings')
export class TeacherOwnEarningsController {
  constructor(private readonly earnings: TeacherEarningsService) {}

  @Get()
  mine(@CurrentUser() user: AuthUser): Promise<TeacherEarningsView> {
    return this.earnings.mine(user.id);
  }

  @Get('payments')
  payments(@CurrentUser() user: AuthUser): Promise<TeacherPaymentView[]> {
    return this.earnings.minePayments(user.id);
  }
}
