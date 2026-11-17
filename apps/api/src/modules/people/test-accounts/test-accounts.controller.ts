import { testFlagBodySchema, type TestFlagBody, type TestFlagResult } from '@ab/shared';
import { Controller, Patch } from '@nestjs/common';
import { z } from 'zod';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { CurrentUser, Permissions } from '@/common/auth/decorators';
import type { AuthUser } from '@/common/auth/verify-token';
import { ZodBody, ZodParam } from '@/common/http/zod-inputs';
import { TestAccountsService } from './test-accounts.service';

const idSchema = z.uuid();

/** PATCH /admin/users/:id/test {is_test}: «حساب تجريبي» (users.write). 404, 409, 400. */
@ApiTags('users')
@ApiBearerAuth()
@Controller('admin/users')
export class UserTestController {
  constructor(private readonly accounts: TestAccountsService) {}

  @Patch(':id/test')
  @Permissions('users.write')
  set(
    @ZodParam('id', idSchema) id: string,
    @ZodBody(testFlagBodySchema) body: TestFlagBody,
    @CurrentUser() user: AuthUser,
  ): Promise<TestFlagResult> {
    return this.accounts.set({ kind: 'profile', id, isTest: body.is_test, actorId: user.id });
  }
}

/** PATCH /students/:id/test {is_test}: «طالب تجريبي» (students.write). 404, 409. */
@ApiTags('students')
@ApiBearerAuth()
@Controller('students')
export class StudentTestController {
  constructor(private readonly accounts: TestAccountsService) {}

  @Patch(':id/test')
  @Permissions('students.write')
  set(
    @ZodParam('id', idSchema) id: string,
    @ZodBody(testFlagBodySchema) body: TestFlagBody,
    @CurrentUser() user: AuthUser,
  ): Promise<TestFlagResult> {
    return this.accounts.set({ kind: 'student', id, isTest: body.is_test, actorId: user.id });
  }
}
