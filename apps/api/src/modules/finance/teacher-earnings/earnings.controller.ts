import { teacherEarningRoutes as routes, type SignedDownload, type SignedUpload } from '@ab/shared';
import type {
  TeacherEarningsBalanceView,
  TeacherEarningsSummaryView,
  TeacherEarningView,
  TeacherPaymentResult,
  TeacherPaymentView,
} from '@ab/money';
import type { Page } from '@ab/core';
import { Controller, HttpCode } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { CurrentUser, Permissions } from '@/common/auth/decorators';
import type { AuthUser } from '@/common/auth/verify-token';
import { Route, RouteInput, type RouteInputOf } from '@/common/http/route';
import { CorrectionsRepo } from './summary/corrections.repo';
import { EarningsReceipts } from './earnings.receipts';
import { EarningsService } from './earnings.service';
import { toSummaryView } from './summary/earnings.summary';

type In<K extends keyof typeof routes> = RouteInputOf<(typeof routes)[K]>;

/** Admin: a teacher's balance, sessions and payments; record a payment (docs/11 §10). */
@ApiTags('teacher-earnings')
@ApiBearerAuth()
@Permissions('earnings.read')
@Controller()
export class TeacherEarningsController {
  constructor(
    private readonly earnings: EarningsService,
    private readonly receipts: EarningsReceipts,
    private readonly corrections: CorrectionsRepo,
  ) {}

  @Route(routes.summary)
  async summary(): Promise<TeacherEarningsSummaryView> {
    return toSummaryView(await this.corrections.summary());
  }

  /** After a rate or a payout_count_* setting changes. */
  @Route(routes.resync)
  @HttpCode(200)
  @Permissions('earnings.write')
  async resync(@RouteInput() { body }: In<'resync'>): Promise<{ lessons: number }> {
    return { lessons: await this.earnings.resync(body.teacherId) };
  }

  /** A wrong transfer is voided with a reason (never deleted); its sessions are owed again. */
  @Route(routes.void)
  @HttpCode(200)
  @Permissions('earnings.write')
  async void(
    @RouteInput() { params, body }: In<'void'>,
    @CurrentUser() user: AuthUser,
  ): Promise<TeacherPaymentView> {
    await this.corrections.voidPayment({ paymentId: params.id, actorId: user.id, ...body });
    return this.earnings.payment(params.id);
  }

  @Route(routes.receipt)
  receipt(@RouteInput() { params }: In<'receipt'>): Promise<SignedDownload> {
    return this.earnings.receipt(params.id);
  }

  @Route(routes.balance)
  balance(@RouteInput() { params }: In<'balance'>): Promise<TeacherEarningsBalanceView> {
    return this.earnings.balance(params.teacherId);
  }

  @Route(routes.sessions)
  sessions(@RouteInput() { params, query }: In<'sessions'>): Promise<Page<TeacherEarningView>> {
    return this.earnings.sessions(params.teacherId, query);
  }

  @Route(routes.payments)
  payments(@RouteInput() { params, query }: In<'payments'>): Promise<Page<TeacherPaymentView>> {
    return this.earnings.payments(params.teacherId, query);
  }

  @Route(routes.record)
  @HttpCode(200)
  @Permissions('earnings.write')
  record(
    @RouteInput() { params, body }: In<'record'>,
    @CurrentUser() user: AuthUser,
  ): Promise<TeacherPaymentResult> {
    return this.earnings.record({ teacherId: params.teacherId, actorId: user.id }, body);
  }

  @Route(routes.receiptUploadUrl)
  @HttpCode(200)
  @Permissions('earnings.write')
  receiptUploadUrl(@RouteInput() { params, body }: In<'receiptUploadUrl'>): Promise<SignedUpload> {
    return this.receipts.uploadUrl(params.teacherId, body);
  }
}
