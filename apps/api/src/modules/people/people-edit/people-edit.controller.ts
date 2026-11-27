import { notesFreeSchema, peopleEditRoutes as routes, type PeopleEditView } from '@ab/shared';
import { Controller, HttpCode } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { z } from 'zod';
import { CurrentUser, Permissions } from '@/common/auth/decorators';
import type { AuthUser } from '@/common/auth/verify-token';
import { parseOrThrow } from '@/common/http/http';
import { Route, RouteInput, type RouteInputOf } from '@/common/http/route';
import { GuardianPhonesService } from '@/modules/people/guardians';
import { PeopleEditService } from './people-edit.service';
import { PeopleViewService } from './people-view.service';
import { PeopleOwnership } from './access/people-ownership';
import { isAdmin } from '@/common/auth/roles';

/** Notes stay the admin's: anyone else's `notes` key answers 400. */
const notesRule = (user: AuthUser): z.ZodType => (isAdmin(user) ? z.object({}) : notesFreeSchema);

/** people.edit only, never students.write; admin-only fields and notes are refused with 400. */
@ApiTags('people')
@ApiBearerAuth()
@Permissions('people.edit')
@Controller()
export class PeopleEditController {
  constructor(
    private readonly people: PeopleEditService,
    private readonly phones: GuardianPhonesService,
    private readonly views: PeopleViewService,
    private readonly owners: PeopleOwnership,
  ) {}

  @Route(routes.view)
  async view(
    @RouteInput() { params }: RouteInputOf<typeof routes.view>,
    @CurrentUser() user: AuthUser,
  ): Promise<PeopleEditView> {
    await this.owners.student(user, params.id);
    return this.views.view(params.id, isAdmin(user));
  }

  @Route(routes.editStudent)
  async editStudent(
    @RouteInput() { params, body }: RouteInputOf<typeof routes.editStudent>,
    @CurrentUser() user: AuthUser,
  ): Promise<{ id: string }> {
    parseOrThrow(notesRule(user), body);
    await this.owners.student(user, params.id);
    const edit = { id: params.id, patch: body, actorId: user.id, admin: isAdmin(user) };
    const row = await this.people.editStudent(edit);
    return { id: row.id };
  }

  @Route(routes.editGuardian)
  async editGuardian(
    @RouteInput() { params, body }: RouteInputOf<typeof routes.editGuardian>,
    @CurrentUser() user: AuthUser,
  ): Promise<{ id: string }> {
    parseOrThrow(notesRule(user), body);
    await this.owners.family(user, params.id);
    const edit = { id: params.id, patch: body, actorId: user.id, admin: isAdmin(user) };
    const row = await this.people.editGuardian(edit);
    return { id: row.id };
  }

  /**
   * The family's second number, `phone` URL-encoded (%2B…), deleted with its audit row in one
   * transaction (remove_family_phone).
   */
  @Route(routes.removePhone)
  @HttpCode(204)
  async removePhone(
    @RouteInput() { params }: RouteInputOf<typeof routes.removePhone>,
    @CurrentUser() user: AuthUser,
  ): Promise<void> {
    await this.owners.family(user, params.id);
    const remove = { guardianId: params.id, phone: params.phone, actorId: user.id };
    await this.phones.removeSecond(remove);
  }
}
