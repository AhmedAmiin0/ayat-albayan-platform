import {
  earningsListQuery,
  teacherPaymentListQuery,
  type SignedDownload,
  type TeacherEarningsBalanceView,
  type TeacherEarningView,
  type TeacherPaymentView,
} from '@ab/shared';
import { Controller, Get, Param, ParseUUIDPipe, Query } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { CurrentUser, Permissions } from '../../common/auth/decorators';
import type { AuthUser } from '../../common/auth/verify-token';
import { notFound } from '../scheduling/errors';
import { parseOrThrow, type Page } from '../teachers/http';
import { TeachersQueries } from '../teachers/teachers.queries';
import { EarningsService } from './earnings.service';

/**
 * The signed-in teacher's own earnings (read only). The teacher id always comes from the token
 * (profile → teachers row), never from the URL: there is no way to ask for someone else's.
 */
@ApiTags('teachers')
@ApiBearerAuth()
@Permissions('self.teacher')
@Controller('teachers/me/earnings')
export class TeacherMyEarningsController {
  constructor(
    private readonly earnings: EarningsService,
    private readonly teachers: TeachersQueries,
  ) {}

  @Get()
  async balance(@CurrentUser() user: AuthUser): Promise<TeacherEarningsBalanceView> {
    return this.earnings.balance(await this.me(user));
  }

  @Get('sessions')
  async sessions(@Query() query: unknown, @CurrentUser() user: AuthUser): Promise<Page<TeacherEarningView>> {
    return this.earnings.sessions(await this.me(user), parseOrThrow(earningsListQuery, query));
  }

  @Get('payments')
  async payments(@Query() query: unknown, @CurrentUser() user: AuthUser): Promise<Page<TeacherPaymentView>> {
    return this.earnings.payments(await this.me(user), parseOrThrow(teacherPaymentListQuery, query));
  }

  @Get('payments/:id/receipt')
  async receipt(@Param('id', ParseUUIDPipe) id: string, @CurrentUser() user: AuthUser): Promise<SignedDownload> {
    return this.earnings.receipt(id, await this.me(user));
  }

  private async me(user: AuthUser): Promise<string> {
    const id = await this.teachers.idByProfile(user.id);
    if (!id) throw notFound('teacher_not_linked');
    return id;
  }
}
