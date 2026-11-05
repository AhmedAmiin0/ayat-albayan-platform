import type { PeopleGuardianPatch, PeopleStudentPatch } from '@ab/shared';
import { ConflictException, Injectable } from '@nestjs/common';
import { AuditService } from '@/common/audit/audit.service';
import { conflict, notFound } from '@/common/http/errors';
import { GuardiansService } from '@/modules/people/guardians';
import { StudentsService } from '@/modules/people/students';
import { changedFields } from './people-edit.mapper';
import { type GuardianRow, PeopleEditRepo, type StudentRow } from './people-edit.repo';

/** One edit: the record, the narrowed body, the actor. */
interface Edit<P> {
  id: string;
  patch: P;
  actorId: string;
}

/** A guardians write refused by the unique phone answers with a `code`, as the clients read. */
const phoneAware = (e: unknown): unknown =>
  e instanceof ConflictException ? conflict('phone_taken') : e;

/**
 * A new main number for a family with a login: its sign-in codes would go to that number, so the
 * change stays the admin's (PATCH /guardians/:id); 409 guardian_has_login here.
 */
const movesLoginPhone = (before: GuardianRow, patch: PeopleGuardianPatch): boolean =>
  Boolean(before.profile_id) &&
  patch.phone_e164 !== undefined &&
  patch.phone_e164 !== before.phone_e164;

/**
 * «تعديل البيانات» (owner 2026-11-02): the admin's writes (StudentsService.update,
 * GuardiansService.update) behind people.edit, the admin-only fields left out by the schemas
 * (peopleStudentPatchSchema, peopleGuardianPatchSchema). Every edit is audited with the named
 * fields before and after ('people_edit'). Any student or family: no ownership check.
 */
@Injectable()
export class PeopleEditService {
  constructor(
    private readonly repo: PeopleEditRepo,
    private readonly students: StudentsService,
    private readonly guardians: GuardiansService,
    private readonly audit: AuditService,
  ) {}

  async editStudent({ id, patch, actorId }: Edit<PeopleStudentPatch>): Promise<StudentRow> {
    const before = await this.repo.student(id);
    if (!before) throw notFound('student_not_found');
    if (Object.keys(patch).length === 0) return before;
    const after = await this.students.update(id, patch, actorId);
    const change = changedFields({ before, after }, Object.keys(patch));
    await this.audit.record({
      actorId,
      entity: 'students',
      entityId: id,
      action: 'people_edit',
      ...change,
    });
    return after;
  }

  async editGuardian({ id, patch, actorId }: Edit<PeopleGuardianPatch>): Promise<GuardianRow> {
    const before = await this.repo.guardian(id);
    if (!before) throw notFound('guardian_not_found');
    if (movesLoginPhone(before, patch)) throw conflict('guardian_has_login');
    if (Object.keys(patch).length === 0) return before;
    const after = await this.guardians.update(id, patch).catch((e: unknown) => {
      throw phoneAware(e);
    });
    const change = changedFields({ before, after }, Object.keys(patch));
    await this.audit.record({
      actorId,
      entity: 'guardians',
      entityId: id,
      action: 'people_edit',
      ...change,
    });
    return after;
  }
}
