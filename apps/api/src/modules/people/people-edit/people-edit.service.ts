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

/** An edit that also names whether the actor is the admin (who may move a login's number). */
interface AdminEdit<P> extends Edit<P> {
  admin: boolean;
}

const movesPhone = (before: GuardianRow, patch: PeopleGuardianPatch): boolean =>
  patch.phone_e164 !== undefined && patch.phone_e164 !== before.phone_e164;

/**
 * A student's own number receives that student's sign-in codes: with a login
 * linked, only the admin moves it (as LOGINS below for the main number).
 */
const guardsOwnPhone = (student: StudentRow, admin: boolean): boolean =>
  !admin && student.profile_id !== null;

type StudentFields = Omit<PeopleStudentPatch, 'phone_e164'>;

interface Logins {
  family: GuardianRow;
  children: readonly Child[];
}
/**
 * The logins whose sign-in codes go to the family's main number: the family's own, and every
 * child's (a student's reset and set codes go to guardians.phone_e164, PasswordTargets.student).
 */
const LOGINS: readonly [PeopleEditError, (l: Logins) => boolean][] = [
  ['guardian_has_login', (l) => Boolean(l.family.profile_id)],
  ['student_has_login', (l) => l.children.some((c) => Boolean(c.profile_id))],
];

/** Admin-only fields are left out by the schemas; audited; no ownership check. */
@Injectable()
export class PeopleEditService {
  constructor(
    private readonly repo: PeopleEditRepo,
    private readonly students: StudentsService,
    private readonly guardians: GuardiansService,
    private readonly audit: AuditService,
  ) {}

  /**
   * 409 student_login_phone before anything is written; then the other fields; the student's own
   * number last, through set_student_phone (its own audit row): a refused number (409 phone_taken /
   * teacher_number) leaves only the number unsaved.
   */
  async editStudent(edit: AdminEdit<PeopleStudentPatch>): Promise<StudentRow> {
    const { id, actorId } = edit;
    const before = await this.repo.student(id);
    if (!before) throw notFound('student_not_found');
    const { phone_e164: phone, ...patch } = edit.patch;
    if (phone !== undefined && guardsOwnPhone(before, edit.admin)) {
      throw conflict('student_login_phone');
    }
    const after = await this.fields(before, { id, patch, actorId });
    if (phone !== undefined) await this.repo.setStudentPhone({ studentId: id, phone, actorId });
    return after;
  }

  async editGuardian(edit: AdminEdit<PeopleGuardianPatch>): Promise<GuardianRow> {
    const { id, patch, actorId, admin } = edit;
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

  private async fields(before: StudentRow, edit: Edit<StudentFields>): Promise<StudentRow> {
    const { id, patch, actorId } = edit;
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
}
