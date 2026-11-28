import type { StudentBalanceAnswer } from '@ab/money';
import { studentBalanceRoutes } from '@ab/shared';
import { Controller } from '@nestjs/common';
import { ApiBearerAuth } from '@nestjs/swagger';
import { CurrentUser } from '@/common/auth/decorators';
import { can } from '@/common/auth/permissions';
import type { AuthUser } from '@/common/auth/verify-token';
import { Route, RouteInput, type RouteInputOf } from '@/common/http/route';
import { toTeacherBalance } from './money/balance.teacher';
import { PackagesService } from './money/packages.service';
import { StudentAccess } from './student-lifecycle/student-access';

/** GET /students/:id/balance (S6, R-SUB-01/03): admin, or the student's teacher. */
@ApiBearerAuth()
@Controller()
export class StudentBalanceController {
  constructor(
    private readonly packages: PackagesService,
    private readonly access: StudentAccess,
  ) {}

  @Route(studentBalanceRoutes.get)
  async balance(
    @RouteInput() { params }: RouteInputOf<typeof studentBalanceRoutes.get>,
    @CurrentUser() user: AuthUser,
  ): Promise<StudentBalanceAnswer> {
    await this.access.check(user, params.id);
    const balance = await this.packages.studentBalance(params.id);
    // Permission, not scope: who may see the full package money view (the admin; a teacher not).
    return can(user, 'subscriptions.read') ? balance : toTeacherBalance(balance);
  }
}
