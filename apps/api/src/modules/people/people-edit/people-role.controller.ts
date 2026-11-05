import {
  contactSelfSchema,
  familyMoveSchema,
  familySearchSchema,
  peopleIdSchema,
  type ContactSelf,
  type ConvertedStudent,
  type FamilyMove,
  type FamilyOption,
} from '@ab/shared';
import { Controller, Get, HttpCode, Patch, Post } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import type { z } from 'zod';
import { CurrentUser, Permissions } from '@/common/auth/decorators';
import type { AuthUser } from '@/common/auth/verify-token';
import { ZodBody, ZodParam, ZodQuery } from '@/common/http/zod-inputs';
import { blanksToNull } from '@/modules/people/guardians';
import { FamilyMoveService, type MoveTarget } from './family-move.service';
import { RoleSwitchService } from './role-switch.service';
import { PeopleOwnership } from './access/people-ownership';

const moveBody = blanksToNull(familyMoveSchema);

/**
 * «ربط بولي أمر آخر» (students.attach_guardian) and guardian ↔ student (people.switch_role), owner
 * 2026-11-02: the assistant's and the admin's, any student or family. Every write is audited;
 * nothing with money, lessons or chats is moved or deleted (FamilyMoveService, RoleSwitchService).
 */
@ApiTags('people')
@ApiBearerAuth()
@Controller('people')
export class PeopleRoleController {
  constructor(
    private readonly families: FamilyMoveService,
    private readonly roles: RoleSwitchService,
    private readonly owners: PeopleOwnership,
  ) {}

  /** The guardian picker: ?search= a name, a number (main or second) or a child's code. */
  @Get('guardians')
  @Permissions('students.attach_guardian')
  search(
    @ZodQuery(familySearchSchema) query: z.output<typeof familySearchSchema>,
  ): Promise<FamilyOption[]> {
    return this.families.families(query.search);
  }

  /** { guardian_id } or { guardian: { name, phone_e164, tz, country } }; 409 same_guardian. */
  @Post('students/:id/guardian')
  @HttpCode(200)
  @Permissions('students.attach_guardian')
  async move(
    @ZodParam('id', peopleIdSchema) id: string,
    @ZodBody(moveBody) move: FamilyMove,
    @CurrentUser() user: AuthUser,
  ) {
    await this.owners.student(user, id);
    // The resolved family must be hers too while the rule is on, unless this move created it.
    const allowed = (target: MoveTarget) => this.owners.target(user, target);
    return this.families.move({ studentId: id, move, actorId: user.id, allowed });
  }

  /** «الطالب هو ولي الأمر»; 409 family_has_self. */
  @Patch('students/:id/contact-self')
  @Permissions('people.switch_role')
  async contactSelf(
    @ZodParam('id', peopleIdSchema) id: string,
    @ZodBody(contactSelfSchema) body: ContactSelf,
    @CurrentUser() user: AuthUser,
  ) {
    await this.owners.student(user, id);
    const value = body.contact_is_self;
    const row = await this.roles.setSelf({ studentId: id, value, actorId: user.id });
    return { id: row.id, contact_is_self: row.contact_is_self };
  }

  /** «تحويل إلى طالب»: 201 { id, code }; 409 guardian_has_self / duplicate_student. */
  @Post('guardians/:id/to-student')
  @Permissions('people.switch_role')
  async toStudent(
    @ZodParam('id', peopleIdSchema) id: string,
    @CurrentUser() user: AuthUser,
  ): Promise<ConvertedStudent> {
    await this.owners.family(user, id);
    return this.roles.guardianToStudent(id, user.id);
  }

  /** «تحويل إلى ولي أمر»: 200 { guardian_id }; 409 student_has_login / student_has_records. */
  @Post('students/:id/to-guardian')
  @HttpCode(200)
  @Permissions('people.switch_role')
  async toGuardian(
    @ZodParam('id', peopleIdSchema) id: string,
    @CurrentUser() user: AuthUser,
  ): Promise<{ guardian_id: string }> {
    await this.owners.student(user, id);
    return this.roles.studentToGuardian(id, user.id);
  }
}
