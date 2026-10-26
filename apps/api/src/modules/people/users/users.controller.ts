import {
  linkCandidatesQuery,
  passwordResetSchema,
  userCreateSchema,
  userDisableSchema,
  userUpdateSchema,
  usersListQuery,
  type LinkCandidate,
  type UserDetail,
  type UserPage,
  type UserRoleOption,
  type UserWithCredential,
} from '@ab/shared';
import { Body, Controller, Delete, Get, Header, HttpCode, Param, ParseUUIDPipe, Patch, Post, Query } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { CurrentUser, Permissions } from '../../../common/auth/decorators';
import type { AuthUser } from '../../../common/auth/verify-token';
import { parseOrThrow } from '../../../common/http/http';
import { UsersCreateService } from './lifecycle/users.create.service';
import { UsersLifecycleService } from './lifecycle/users.lifecycle.service';
import { UsersService, type Actor } from './users.service';

const actorOf = (user: AuthUser): Actor => ({ id: user.id, permissions: user.permissions ?? [] });
const uuid = new ParseUUIDPipe();

/**
 * «المستخدمون»: every login of the academy (admin, teacher, assistant, sales, guardian, student).
 * users.read for the directory, users.write for everything that changes a login. Secrets (a
 * generated password, a recovery link) appear only in the response of create / reset-password.
 */
@ApiTags('users')
@ApiBearerAuth()
@Controller('users')
export class UsersController {
  constructor(
    private readonly users: UsersService,
    private readonly creator: UsersCreateService,
    private readonly lifecycle: UsersLifecycleService,
  ) {}

  @Get()
  @Permissions('users.read')
  list(@Query() query: unknown): Promise<UserPage> {
    return this.users.list(parseOrThrow(usersListQuery, query));
  }

  /** System and custom roles; `assignable` = the caller holds every grant of the role. */
  @Get('role-options')
  @Permissions('users.read')
  roleOptions(@CurrentUser() user: AuthUser): Promise<UserRoleOption[]> {
    return this.users.roleOptions(actorOf(user));
  }

  /** Teachers / students / guardians without a login, for the "link to" pickers (teachers.write / students.write / guardians.write of the kind). */
  @Get('link-candidates')
  @Permissions('users.write')
  candidates(@Query() query: unknown, @CurrentUser() user: AuthUser): Promise<LinkCandidate[]> {
    return this.users.candidates(parseOrThrow(linkCandidatesQuery, query), actorOf(user));
  }

  @Get(':id')
  @Permissions('users.read')
  read(@Param('id', uuid) id: string): Promise<UserDetail> {
    return this.users.get(id);
  }

  /** 409 email_taken / link_taken, 403 permission_not_held, 400 password_* / link_target_not_found. */
  @Post()
  @Permissions('users.write')
  @Header('Cache-Control', 'no-store')
  create(@Body() body: unknown, @CurrentUser() user: AuthUser): Promise<UserWithCredential> {
    return this.creator.create(parseOrThrow(userCreateSchema, body), actorOf(user));
  }

  /** 403 permission_not_held / system_admin_only / admin_role_only, 409 role_change_linked / last_admin / self_lockout / email_taken / phone_taken. */
  @Patch(':id')
  @Permissions('users.write')
  update(@Param('id', uuid) id: string, @Body() body: unknown, @CurrentUser() user: AuthUser): Promise<UserDetail> {
    return this.users.update(id, parseOrThrow(userUpdateSchema, body), actorOf(user));
  }

  /** 409 cannot_disable_self / last_admin. Also bans the login and revokes its sessions. */
  @Post(':id/disable')
  @HttpCode(200)
  @Permissions('users.write')
  disable(@Param('id', uuid) id: string, @Body() body: unknown, @CurrentUser() user: AuthUser): Promise<UserDetail> {
    return this.lifecycle.disable(id, parseOrThrow(userDisableSchema, body ?? {}), actorOf(user));
  }

  /** 409 self_lockout (nobody re-enables themselves). */
  @Post(':id/enable')
  @HttpCode(200)
  @Permissions('users.write')
  enable(@Param('id', uuid) id: string, @CurrentUser() user: AuthUser): Promise<UserDetail> {
    return this.lifecycle.enable(id, actorOf(user));
  }

  @Post(':id/reset-password')
  @HttpCode(200)
  @Permissions('users.write')
  @Header('Cache-Control', 'no-store')
  resetPassword(@Param('id', uuid) id: string, @Body() body: unknown, @CurrentUser() user: AuthUser): Promise<UserWithCredential> {
    return this.lifecycle.resetPassword(id, parseOrThrow(passwordResetSchema, body ?? {}), actorOf(user));
  }

  @Post(':id/sign-out')
  @HttpCode(204)
  @Permissions('users.write')
  signOut(@Param('id', uuid) id: string, @CurrentUser() user: AuthUser): Promise<void> {
    return this.lifecycle.signOut(id, actorOf(user));
  }

  /** 409 cannot_delete_self / last_admin / users_has_history {references, hint}. */
  @Delete(':id')
  @HttpCode(204)
  @Permissions('users.write')
  remove(@Param('id', uuid) id: string, @CurrentUser() user: AuthUser): Promise<void> {
    return this.lifecycle.remove(id, actorOf(user));
  }
}
