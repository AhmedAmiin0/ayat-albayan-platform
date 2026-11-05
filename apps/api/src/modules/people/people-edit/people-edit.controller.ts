import {
  notesFreeSchema,
  peopleGuardianPatchSchema,
  peopleStudentPatchSchema,
  peopleIdSchema,
  phoneE164,
  type PeopleEditView,
  type PeopleGuardianPatch,
  type PeopleStudentPatch,
} from '@ab/shared';
import { Controller, Delete, Get, HttpCode, Patch } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { z } from 'zod';
import { CurrentUser, Permissions } from '@/common/auth/decorators';
import type { AuthUser } from '@/common/auth/verify-token';
import { parseOrThrow } from '@/common/http/http';
import { ZodBody, ZodParam } from '@/common/http/zod-inputs';
import { blanksToNull, GuardianPhonesService } from '@/modules/people/guardians';
import { PeopleEditService } from './people-edit.service';
import { PeopleViewService } from './people-view.service';
import { PeopleOwnership } from './access/people-ownership';

const studentBody = blanksToNull(peopleStudentPatchSchema);
const guardianBody = blanksToNull(peopleGuardianPatchSchema);
/**
 * The admin as the role actually held: the admin's own guardians.write (PATCH /guardians/:id),
 * never the base-role claim, so a custom role on the admin base without it stays bound.
 */
const isAdmin = (user: AuthUser): boolean => user.permissions?.includes('guardians.write') ?? false;
/** Notes stay the admin's (owner 2026-10-27): anyone else's `notes` key answers 400. */
const notesRule = (user: AuthUser): z.ZodType => (isAdmin(user) ? z.object({}) : notesFreeSchema);

/**
 * «تعديل البيانات» of a student and their family (owner 2026-11-02), the assistant's and the
 * admin's: people.edit, never students.write / guardians.write (those also create, delete and
 * merge). Any student or family. 400 for an admin-only field (status, program, teacher, meeting
 * link, source) and for notes from anyone but the admin, 404 student_not_found /
 * guardian_not_found, 409 phone_taken.
 */
@ApiTags('people')
@ApiBearerAuth()
@Permissions('people.edit')
@Controller('people')
export class PeopleEditController {
  constructor(
    private readonly people: PeopleEditService,
    private readonly phones: GuardianPhonesService,
    private readonly views: PeopleViewService,
    private readonly owners: PeopleOwnership,
  ) {}

  @Get('students/:id')
  async view(
    @ZodParam('id', peopleIdSchema) id: string,
    @CurrentUser() user: AuthUser,
  ): Promise<PeopleEditView> {
    // While the ownership rule is on, sales read only their own students (as the writes).
    await this.owners.student(user, id);
    return this.views.view(id, isAdmin(user));
  }

  @Patch('students/:id')
  async editStudent(
    @ZodParam('id', peopleIdSchema) id: string,
    @ZodBody(studentBody) patch: PeopleStudentPatch,
    @CurrentUser() user: AuthUser,
  ): Promise<{ id: string }> {
    parseOrThrow(notesRule(user), patch);
    await this.owners.student(user, id);
    const row = await this.people.editStudent({ id, patch, actorId: user.id });
    return { id: row.id };
  }

  @Patch('guardians/:id')
  async editGuardian(
    @ZodParam('id', peopleIdSchema) id: string,
    @ZodBody(guardianBody) patch: PeopleGuardianPatch,
    @CurrentUser() user: AuthUser,
  ): Promise<{ id: string }> {
    parseOrThrow(notesRule(user), patch);
    await this.owners.family(user, id);
    const edit = { id, patch, actorId: user.id, admin: isAdmin(user) };
    const row = await this.people.editGuardian(edit);
    return { id: row.id };
  }

  /**
   * The family's second number, `phone` URL-encoded (%2B…), deleted with its audit row in one
   * transaction (remove_family_phone); 404 phone_not_found for the main one.
   */
  @Delete('guardians/:id/phones/:phone')
  @HttpCode(204)
  async removePhone(
    @ZodParam('id', peopleIdSchema) id: string,
    @ZodParam('phone', phoneE164) phone: string,
    @CurrentUser() user: AuthUser,
  ): Promise<void> {
    await this.owners.family(user, id);
    await this.phones.removeSecond({ guardianId: id, phone, actorId: user.id });
  }
}
