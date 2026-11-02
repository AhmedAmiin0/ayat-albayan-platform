import type { ConvertedStudent } from '@ab/shared';
import { Injectable } from '@nestjs/common';
import { AuditService } from '@/common/audit/audit.service';
import { conflict, notFound } from '@/common/http/errors';
import { detectDuplicates } from '@/modules/people/students';
import { selfStudentInsert } from './people-edit.mapper';
import { PeopleEditRepo, type StudentRow } from './people-edit.repo';
import { StudentRecordsRepo } from './student-records.repo';

interface SelfInput {
  studentId: string;
  value: boolean;
  actorId: string;
}

/**
 * Guardian ↔ student (owner 2026-11-02), the smallest safe version:
 *  - «الطالب هو ولي الأمر»: students.contact_is_self, one child per family (409 family_has_self).
 *  - «تحويل إلى طالب»: the guardian who is really the learner gets a student row in their own
 *    family (contact_is_self). The guardian row stays: it holds the number, the chats and the
 *    family login, which the adult learner keeps using («حسابي»); no login changes role.
 *  - «تحويل إلى ولي أمر»: a student row that is really the parent. Only while it has no history at
 * all (409 student_has_records { tables }) and no login of its own (409 student_has_login: the
 * users module refuses a role change on a linked login, role_change_linked). A full audit copy is
 * written first, the history checked again, then the empty row is removed and the family takes its
 * name; the other children, the phones and the money stay as they are. Not one transaction (no
 * migration): the window between the last check and the delete is one round trip.
 */
@Injectable()
export class RoleSwitchService {
  constructor(
    private readonly repo: PeopleEditRepo,
    private readonly records: StudentRecordsRepo,
    private readonly audit: AuditService,
  ) {}

  async setSelf({ studentId, value, actorId }: SelfInput): Promise<StudentRow> {
    const student = await this.repo.student(studentId);
    if (!student) throw notFound('student_not_found');
    if (student.contact_is_self === value) return student;
    const children = await this.repo.children(student.guardian_id);
    const other = children.some((c) => c.contact_is_self && c.id !== studentId);
    if (value && other) throw conflict('family_has_self');
    const after = await this.repo.setSelf(studentId, value);
    if (!after) throw notFound('student_not_found');
    const audit = { actorId, entity: 'students', entityId: studentId, action: 'contact_is_self' };
    const change = { before: { contact_is_self: !value }, after: { contact_is_self: value } };
    await this.audit.record({ ...audit, ...change });
    return after;
  }

  async guardianToStudent(guardianId: string, actorId: string): Promise<ConvertedStudent> {
    const guardian = await this.repo.guardian(guardianId);
    if (!guardian) throw notFound('guardian_not_found');
    const children = await this.repo.children(guardianId);
    if (children.some((c) => c.contact_is_self)) throw conflict('guardian_has_self');
    const twins = detectDuplicates(guardian.name, children);
    const candidates = twins.map(({ id, code, name }) => ({ id, code, name }));
    if (candidates.length > 0) throw conflict('duplicate_student', { candidates });
    const row = await this.records.insert(selfStudentInsert(guardian));
    const after = { guardian_id: guardianId, code: row.code, contact_is_self: true };
    const action = 'converted_from_guardian';
    await this.audit.record({ actorId, entity: 'students', entityId: row.id, action, after });
    return { id: row.id, code: row.code };
  }

  async studentToGuardian(studentId: string, actorId: string): Promise<{ guardian_id: string }> {
    const student = await this.repo.student(studentId);
    if (!student) throw notFound('student_not_found');
    if (student.profile_id) throw conflict('student_has_login');
    await this.assertEmpty(studentId);
    const guardian = await this.repo.guardian(student.guardian_id);
    if (!guardian) throw notFound('guardian_not_found');
    // The full copy is written BEFORE the delete: a failed audit insert deletes nothing.
    const copy = { actorId, entity: 'students', entityId: studentId, before: student };
    await this.audit.record({ ...copy, action: 'to_guardian_snapshot' });
    await this.assertEmpty(studentId);
    const removed = await this.records.removeEmpty(studentId);
    if (!removed) throw notFound('student_not_found');
    const renamed = await this.repo.renameGuardian(guardian.id, student.name);
    const after = { name: renamed.name, from_student: studentId, student_code: student.code };
    const names = { before: { name: guardian.name }, after };
    const action = 'converted_to_guardian';
    await this.audit.record({
      actorId,
      entity: 'guardians',
      entityId: guardian.id,
      action,
      ...names,
    });
    return { guardian_id: guardian.id };
  }

  /** 409 student_has_records { tables } while any history row exists (checked twice). */
  private async assertEmpty(studentId: string): Promise<void> {
    const tables = await this.records.records(studentId);
    if (tables.length > 0) throw conflict('student_has_records', { tables });
  }
}
