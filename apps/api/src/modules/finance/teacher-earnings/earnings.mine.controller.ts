import { myEarningRoutes as routes, type SignedDownload } from '@ab/shared';
import type { TeacherEarningsBalanceView, TeacherEarningView, TeacherPaymentView } from '@ab/money';
import type { Page } from '@ab/core';
import { Controller } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { CurrentUser, Permissions } from '@/common/auth/decorators';
import type { AuthUser } from '@/common/auth/verify-token';
import { notFound } from '@/common/http/errors';
import { Route, RouteInput, type RouteInputOf } from '@/common/http/route';
import { TeachersRepo } from '@/modules/people/teachers/teachers.repo';
import { EarningsService } from './earnings.service';

type In<K extends keyof typeof routes> = RouteInputOf<(typeof routes)[K]>;

/**
 * The signed-in teacher's own earnings (read only). The teacher id always comes from the token
 * (profile → teachers row), never from the URL: there is no way to ask for someone else's.
 */
@ApiTags('teachers')
@ApiBearerAuth()
@Permissions('self.teacher')
@Controller()
export class TeacherMyEarningsController {
  constructor(
    private readonly earnings: EarningsService,
    private readonly teachers: TeachersRepo,
  ) {}

  @Route(routes.balance)
  async balance(@CurrentUser() user: AuthUser): Promise<TeacherEarningsBalanceView> {
    return this.earnings.balance(await this.me(user));
  }

  @Route(routes.sessions)
  async sessions(
    @RouteInput() { query }: In<'sessions'>,
    @CurrentUser() user: AuthUser,
  ): Promise<Page<TeacherEarningView>> {
    return this.earnings.sessions(await this.me(user), query);
  }

  @Route(routes.payments)
  async payments(
    @RouteInput() { query }: In<'payments'>,
    @CurrentUser() user: AuthUser,
  ): Promise<Page<TeacherPaymentView>> {
    return this.earnings.payments(await this.me(user), query);
  }

  @Route(routes.receipt)
  async receipt(
    @RouteInput() { params }: In<'receipt'>,
    @CurrentUser() user: AuthUser,
  ): Promise<SignedDownload> {
    return this.earnings.receipt(params.id, await this.me(user));
  }

  private async me(user: AuthUser): Promise<string> {
    const id = await this.teachers.idByProfile(user.id);
    if (!id) throw notFound('teacher_not_linked');
    return id;
  }
}
