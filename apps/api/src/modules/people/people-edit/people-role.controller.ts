import { peopleEditRoutes as routes, type ConvertedStudent, type FamilyOption } from '@ab/shared';
import { Controller, HttpCode } from '@nestjs/common';
import { ApiBearerAuth } from '@nestjs/swagger';
import { CurrentUser } from '@/common/auth/decorators';
import type { AuthUser } from '@/common/auth/verify-token';
import { Route, RouteInput, type RouteInputOf } from '@/common/http/route';
import { FamilyMoveService, type MoveTarget } from './family-move.service';
import { RoleSwitchService } from './role-switch.service';
import { PeopleOwnership } from './access/people-ownership';

/** Every write is audited; nothing with money, lessons or chats is moved or deleted. */
@ApiBearerAuth()
@Controller()
export class PeopleRoleController {
  constructor(
    private readonly families: FamilyMoveService,
    private readonly roles: RoleSwitchService,
    private readonly owners: PeopleOwnership,
  ) {}

  /** The guardian picker: ?search= a name, a number (main or second) or a child's code. */
  @Route(routes.families)
  search(@RouteInput() { query }: RouteInputOf<typeof routes.families>): Promise<FamilyOption[]> {
    return this.families.families(query.search);
  }

  /** { guardian_id } or { guardian: { name, phone_e164, tz, country } }. */
  @Route(routes.move)
  @HttpCode(200)
  async move(
    @RouteInput() { params, body }: RouteInputOf<typeof routes.move>,
    @CurrentUser() user: AuthUser,
  ) {
    await this.owners.student(user, params.id);
    // The resolved family must be hers too while the rule is on, unless this move created it.
    const allowed = (target: MoveTarget) => this.owners.target(user, target);
    return this.families.move({ studentId: params.id, move: body, actorId: user.id, allowed });
  }

  @Route(routes.contactSelf)
  async contactSelf(
    @RouteInput() { params, body }: RouteInputOf<typeof routes.contactSelf>,
    @CurrentUser() user: AuthUser,
  ) {
    await this.owners.student(user, params.id);
    const self = { studentId: params.id, value: body.contact_is_self, actorId: user.id };
    const row = await this.roles.setSelf(self);
    return { id: row.id, contact_is_self: row.contact_is_self };
  }

  @Route(routes.toStudent)
  async toStudent(
    @RouteInput() { params }: RouteInputOf<typeof routes.toStudent>,
    @CurrentUser() user: AuthUser,
  ): Promise<ConvertedStudent> {
    await this.owners.family(user, params.id);
    return this.roles.guardianToStudent(params.id, user.id);
  }

  @Route(routes.toGuardian)
  @HttpCode(200)
  async toGuardian(
    @RouteInput() { params }: RouteInputOf<typeof routes.toGuardian>,
    @CurrentUser() user: AuthUser,
  ): Promise<{ guardian_id: string }> {
    await this.owners.student(user, params.id);
    return this.roles.studentToGuardian(params.id, user.id);
  }
}
