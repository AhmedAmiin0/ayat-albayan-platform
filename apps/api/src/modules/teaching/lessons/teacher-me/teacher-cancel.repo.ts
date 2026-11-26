import { Inject, Injectable } from '@nestjs/common';
import { DB, type Db } from '@/common/db/db.module';
import { pgError } from '@/common/db/errors';

const ids = (values: readonly (string | null)[]): string[] =>
  [...new Set(values.filter((v): v is string => v !== null))];

/**
 * Who follows the students of a cancelled lesson (docs/46 D3): the assistant who brought each
 * student (students.brought_by) and who holds the lead its family came from (leads.assigned_to),
 * the ownership rule's two links. Read-only, service role.
 */
@Injectable()
export class TeacherCancelRepo {
  constructor(@Inject(DB) private readonly db: Db) {}

  async ownerIds(studentIds: readonly string[]): Promise<string[]> {
    return ids([...(await this.ownersOf(studentIds)).values()].flat());
  }

  /** Each student's owners (both links), in two reads for any number of students. */
  async ownersOf(studentIds: readonly string[]): Promise<Map<string, string[]>> {
    if (studentIds.length === 0) return new Map();
    const students = await this.db
      .from('students')
      .select('id, brought_by, guardian_id')
      .in('id', [...new Set(studentIds)]);
    if (students.error) throw pgError(students.error);
    const guardians = ids(students.data.map((s) => s.guardian_id));
    const leads = await this.db
      .from('leads')
      .select('assigned_to, converted_guardian_id')
      .in('converted_guardian_id', guardians);
    if (leads.error) throw pgError(leads.error);
    const holders = (guardian: string | null) =>
      leads.data.filter((l) => l.converted_guardian_id === guardian).map((l) => l.assigned_to);
    type Student = (typeof students.data)[number];
    const of = (s: Student) => ids([s.brought_by, ...holders(s.guardian_id)]);
    return new Map(students.data.map((s) => [s.id, of(s)]));
  }
}
