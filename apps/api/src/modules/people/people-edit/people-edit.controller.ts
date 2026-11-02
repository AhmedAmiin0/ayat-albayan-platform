import {
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
import { CurrentUser, Permissions } from '@/common/auth/decorators';
import type { AuthUser } from '@/common/auth/verify-token';
import { ZodBody, ZodParam } from '@/common/http/zod-inputs';
import { blanksToNull, GuardianPhonesService } from '@/modules/people/guardians';
import { PeopleEditService } from './people-edit.service';
import { PeopleViewService } from './people-view.service';

const studentBody = blanksToNull(peopleStudentPatchSchema);
const guardianBody = blanksToNull(peopleGuardianPatchSchema);

/**
 * «تعديل البيانات» of a student and their family (owner 2026-11-02), the assistant's and the
 * admin's: people.edit, never students.write / guardians.write (those also create, delete and
 * merge). Any student or family. 400 for an admin-only field (status, program, teacher, meeting
 * link, source), 404 student_not_found / guardian_not_found, 409 phone_taken.
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
  ) {}

  @Get('students/:id')
  view(@ZodParam('id', peopleIdSchema) id: string): Promise<PeopleEditView> {
    return this.views.view(id);
  }

  @Patch('students/:id')
  async editStudent(
    @ZodParam('id', peopleIdSchema) id: string,
    @ZodBody(studentBody) patch: PeopleStudentPatch,
    @CurrentUser() user: AuthUser,
  ): Promise<{ id: string }> {
    const row = await this.people.editStudent({ id, patch, actorId: user.id });
    return { id: row.id };
  }

  @Patch('guardians/:id')
  async editGuardian(
    @ZodParam('id', peopleIdSchema) id: string,
    @ZodBody(guardianBody) patch: PeopleGuardianPatch,
    @CurrentUser() user: AuthUser,
  ): Promise<{ id: string }> {
    const row = await this.people.editGuardian({ id, patch, actorId: user.id });
    return { id: row.id };
  }

  /**
   * The family's second number, `phone` URL-encoded (%2B…), deleted with its audit row in one
   * transaction (remove_family_phone); 404 phone_not_found for the main one.
   */
  @Delete('guardians/:id/phones/:phone')
  @HttpCode(204)
  removePhone(
    @ZodParam('id', peopleIdSchema) id: string,
    @ZodParam('phone', phoneE164) phone: string,
    @CurrentUser() user: AuthUser,
  ): Promise<void> {
    return this.phones.removeSecond({ guardianId: id, phone, actorId: user.id });
  }
}
