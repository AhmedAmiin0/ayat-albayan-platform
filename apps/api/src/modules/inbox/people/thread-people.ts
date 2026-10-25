import type { ThreadPeople } from '@ab/shared';
import type { Db } from '../../../common/db/db.module';
import type { BalanceQueries } from '../../subscriptions/money/balance.queries';
import type { PackagesService } from '../../subscriptions/money/packages.service';
import { dbError } from '../../../common/http/http';
import { familyTags, toThreadStudent, type FamilyTag } from './thread-people.mapper';
import type { ThreadRow } from '../threads/threads.mapper';

export interface PeopleDeps {
  db: Db;
  packages: PackagesService;
  balances: BalanceQueries;
}

const STUDENTS = 'id, code, name, status, teacher:teachers(display_name_ar)';

/**
 * GET /threads/:phone `people` (R-SUB-01): the v_threads row's guardian and lead, and every student
 * of the guardian (oldest first) with their newest package. No guardian → no students.
 */
/** A thread's row, or a number with no message yet (KnownNumber). */
export type PeopleOf = Pick<ThreadRow, 'guardian_id' | 'guardian_name' | 'lead_id' | 'lead_status'>;

export async function threadPeople(deps: PeopleDeps, row: PeopleOf | null): Promise<ThreadPeople> {
  const guardian = row?.guardian_id ? { id: row.guardian_id, name: row.guardian_name ?? '' } : null;
  const lead = row?.lead_id && row.lead_status ? { id: row.lead_id, status: row.lead_status } : null;
  if (!guardian) return { guardian, lead, students: [] };
  const { data, error } = await deps.db.from('students').select(STUDENTS).eq('guardian_id', guardian.id).order('created_at');
  if (error) throw dbError(error);
  // ponytail: one S6 balance read per child (a family has a handful); batch if families grow.
  const students = await Promise.all(data.map(async (s) => toThreadStudent(s, await deps.packages.studentBalance(s.id))));
  return { guardian, lead, students };
}

/** H1: the page's guardians' tags (familyTags), one read for the page. */
export async function familyTagsOf(deps: PeopleDeps, guardianIds: readonly string[]): Promise<Map<string, FamilyTag>> {
  const ids = [...new Set(guardianIds)];
  if (ids.length === 0) return new Map(); // .in() with no ids is a PostgREST error
  const { data, error } = await deps.db.from('students').select('id, guardian_id, subscriptions(id, status)').in('guardian_id', ids);
  if (error) throw dbError(error);
  const balances = await deps.balances.forStudents(data.map((s) => s.id));
  return familyTags(data, balances);
}
