import { testAccountRoutes as routes, type TestFlagResult } from '@ab/shared';
import { Controller, Inject } from '@nestjs/common';
import { ApiBearerAuth } from '@nestjs/swagger';
import { CurrentUser } from '@/common/auth/decorators';
import type { AuthUser } from '@/common/auth/verify-token';
import { Route, RouteInput, type RouteInputOf } from '@/common/http/route';
import { TestAccountsService } from './test-accounts.service';

/** users.write; 404, 409, 400. */
@ApiBearerAuth()
@Controller()
export class UserTestController {
  constructor(@Inject(TestAccountsService) private readonly accounts: TestAccountsService) {}

  @Route(routes.user)
  set(
    @RouteInput() { params, body }: RouteInputOf<typeof routes.user>,
    @CurrentUser() user: AuthUser,
  ): Promise<TestFlagResult> {
    const write = { id: params.id, isTest: body.is_test, actorId: user.id };
    return this.accounts.set({ kind: 'profile', ...write });
  }
}

/** students.write; 404, 409. */
@ApiBearerAuth()
@Controller()
export class StudentTestController {
  constructor(@Inject(TestAccountsService) private readonly accounts: TestAccountsService) {}

  @Route(routes.student)
  set(
    @RouteInput() { params, body }: RouteInputOf<typeof routes.student>,
    @CurrentUser() user: AuthUser,
  ): Promise<TestFlagResult> {
    const write = { id: params.id, isTest: body.is_test, actorId: user.id };
    return this.accounts.set({ kind: 'student', ...write });
  }
}
