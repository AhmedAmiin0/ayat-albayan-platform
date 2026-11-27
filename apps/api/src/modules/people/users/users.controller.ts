import {
  usersRoutes as routes,
  type LinkCandidate,
  type UserDetail,
  type UserPage,
  type UserRoleOption,
  type UserWithCredential,
} from '@ab/shared';
import { Controller, Header, HttpCode } from '@nestjs/common';
import { ApiBearerAuth } from '@nestjs/swagger';
import { CurrentUser } from '@/common/auth/decorators';
import type { AuthUser } from '@/common/auth/verify-token';
import { Route, RouteInput, type RouteInputOf } from '@/common/http/route';
import { UsersCreateService } from './lifecycle/users.create.service';
import { UsersLifecycleService } from './lifecycle/users.lifecycle.service';
import { actorOf, UsersService } from './users.service';
import { UsersUpdateService } from './update/users.update.service';

/** Secrets appear only in the response of create or reset-password. */
@ApiBearerAuth()
@Controller()
export class UsersController {
  constructor(
    private readonly users: UsersService,
    private readonly updater: UsersUpdateService,
    private readonly creator: UsersCreateService,
    private readonly lifecycle: UsersLifecycleService,
  ) {}

  @Route(routes.list)
  list(@RouteInput() { query }: RouteInputOf<typeof routes.list>): Promise<UserPage> {
    return this.users.list(query);
  }

  @Route(routes.roleOptions)
  roleOptions(@CurrentUser() user: AuthUser): Promise<UserRoleOption[]> {
    return this.users.roleOptions(actorOf(user));
  }

  @Route(routes.linkCandidates)
  candidates(
    @RouteInput() { query }: RouteInputOf<typeof routes.linkCandidates>,
    @CurrentUser() user: AuthUser,
  ): Promise<LinkCandidate[]> {
    return this.users.candidates(query, actorOf(user));
  }

  @Route(routes.read)
  read(@RouteInput() { params }: RouteInputOf<typeof routes.read>): Promise<UserDetail> {
    return this.users.get(params.id);
  }

  @Route(routes.create)
  @Header('Cache-Control', 'no-store')
  create(
    @RouteInput() { body }: RouteInputOf<typeof routes.create>,
    @CurrentUser() user: AuthUser,
  ): Promise<UserWithCredential> {
    return this.creator.create(body, actorOf(user));
  }

  /**
   * 403 permission_not_held / system_admin_only / admin_role_only, 409 role_change_linked /
   * last_admin / self_lockout / email_taken / phone_taken / link_taken, 400 link_not_allowed /
   * link_target_not_found.
   */
  @Route(routes.update)
  update(
    @RouteInput() { params, body }: RouteInputOf<typeof routes.update>,
    @CurrentUser() user: AuthUser,
  ): Promise<UserDetail> {
    return this.updater.update(params.id, body, actorOf(user));
  }

  @Route(routes.disable)
  @HttpCode(200)
  disable(
    @RouteInput() { params, body }: RouteInputOf<typeof routes.disable>,
    @CurrentUser() user: AuthUser,
  ): Promise<UserDetail> {
    return this.lifecycle.disable(params.id, body, actorOf(user));
  }

  @Route(routes.enable)
  @HttpCode(200)
  enable(
    @RouteInput() { params }: RouteInputOf<typeof routes.enable>,
    @CurrentUser() user: AuthUser,
  ): Promise<UserDetail> {
    return this.lifecycle.enable(params.id, actorOf(user));
  }

  @Route(routes.resetPassword)
  @HttpCode(200)
  @Header('Cache-Control', 'no-store')
  resetPassword(
    @RouteInput() { params, body }: RouteInputOf<typeof routes.resetPassword>,
    @CurrentUser() user: AuthUser,
  ): Promise<UserWithCredential> {
    return this.lifecycle.resetPassword(params.id, body, actorOf(user));
  }

  @Route(routes.signOut)
  @HttpCode(204)
  signOut(
    @RouteInput() { params }: RouteInputOf<typeof routes.signOut>,
    @CurrentUser() user: AuthUser,
  ): Promise<void> {
    return this.lifecycle.signOut(params.id, actorOf(user));
  }

  @Route(routes.remove)
  @HttpCode(204)
  remove(
    @RouteInput() { params }: RouteInputOf<typeof routes.remove>,
    @CurrentUser() user: AuthUser,
  ): Promise<void> {
    return this.lifecycle.remove(params.id, actorOf(user));
  }
}
