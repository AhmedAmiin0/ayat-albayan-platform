import { Inject, Injectable } from '@nestjs/common';
import { DB, type Db } from '@/common/db/db.module';
import { dbError } from '@/common/http/http';

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
    if (studentIds.length === 0) return [];
    const students = await this.db
      .from('students')
      .select('brought_by, guardian_id')
      .in('id', [...studentIds]);
    if (students.error) throw dbError(students.error);
    const guardians = ids(students.data.map((s) => s.guardian_id));
    const leads = await this.db
      .from('leads')
      .select('assigned_to')
      .in('converted_guardian_id', guardians);
    if (leads.error) throw dbError(leads.error);
    const brought = students.data.map((s) => s.brought_by);
    return ids([...brought, ...leads.data.map((l) => l.assigned_to)]);
  }
}
