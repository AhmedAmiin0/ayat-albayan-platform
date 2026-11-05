import type { PeopleEditError, PeopleGuardianPatch, PeopleStudentPatch } from '@ab/shared';
import { ConflictException, Injectable } from '@nestjs/common';
import { AuditService } from '@/common/audit/audit.service';
import { conflict, notFound } from '@/common/http/errors';
import { GuardiansService } from '@/modules/people/guardians';
import { StudentsService } from '@/modules/people/students';
import { changedFields } from './people-edit.mapper';
import { type Child, type GuardianRow, PeopleEditRepo, type StudentRow } from './people-edit.repo';

/** One edit: the record, the narrowed body, the actor. */
interface Edit<P> {
  id: string;
  patch: P;
  actorId: string;
}

/** A guardians write refused by the unique phone answers with a `code`, as the clients read. */
const phoneAware = (e: unknown): unknown =>
  e instanceof ConflictException ? conflict('phone_taken') : e;

/** A guardian edit also names whether the actor is the admin (who may move a login's number). */
interface GuardianEdit extends Edit<PeopleGuardianPatch> {
  admin: boolean;
}

const movesPhone = (before: GuardianRow, patch: PeopleGuardianPatch): boolean =>
  patch.phone_e164 !== undefined && patch.phone_e164 !== before.phone_e164;

type Logins = { family: GuardianRow; children: readonly Child[] };
/**
 * The logins whose sign-in codes go to the family's main number: the family's own, and every
 * child's (a student's reset and set codes go to guardians.phone_e164, PasswordTargets.student).
 */
const LOGINS: readonly [PeopleEditError, (l: Logins) => boolean][] = [
  ['guardian_has_login', (l) => Boolean(l.family.profile_id)],
  ['student_has_login', (l) => l.children.some((c) => Boolean(c.profile_id))],
];

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

  async editGuardian({ id, patch, actorId, admin }: GuardianEdit): Promise<GuardianRow> {
    const before = await this.repo.guardian(id);
    if (!before) throw notFound('guardian_not_found');
    if (!admin && movesPhone(before, patch)) await this.assertNoLogin(before);
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

  /**
   * A new main number for a family with a login (its own or a child's) would hand that login to
   * the new number: the assistant gets 409 guardian_has_login / student_has_login; the admin may
   * (audited as any edit).
   */
  private async assertNoLogin(family: GuardianRow): Promise<void> {
    const children = await this.repo.children(family.id);
    const code = LOGINS.find(([, has]) => has({ family, children }))?.[0];
    if (code) throw conflict(code);
  }
}
