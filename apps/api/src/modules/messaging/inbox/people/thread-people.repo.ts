import type { ThreadPeople } from '@ab/shared';
import type { Db } from '@/common/db/db.module';
import type { BalanceRepo, PackagesService } from '@/modules/finance/subscriptions';
import { rows } from '@/common/db/errors';
import { familyTags, toThreadStudent, type FamilyTag } from './thread-people.mapper';
import { guardianOf, leadOf, type PeopleOf } from './thread-people';

interface PeopleDeps {
  db: Db;
  packages: PackagesService;
  balances: BalanceRepo;
}

const STUDENTS = 'id, code, name, status, teacher:teachers(display_name_ar)';

/**
 * GET /threads/:phone `people` (R-SUB-01): the v_threads row's guardian and lead, and every student
 * of the guardian (oldest first) with their newest package. No guardian → no students.
 */
export async function threadPeople(deps: PeopleDeps, row: PeopleOf | null): Promise<ThreadPeople> {
  const guardian = guardianOf(row);
  const lead = leadOf(row);
  if (!guardian) return { guardian, lead, students: [] };
  const data = rows(
    await deps.db
      .from('students')
      .select(STUDENTS)
      .eq('guardian_id', guardian.id)
      .order('created_at'),
  );
  const balances = await deps.packages.studentBalances(data);
  const students = balances.map(([s, balance]) => toThreadStudent(s, balance));
  return { guardian, lead, students };
}

/** H1: the page's guardians' tags (familyTags, ring at `threshold`), one read for the page. */
export async function familyTagsOf(
  deps: PeopleDeps,
  guardianIds: readonly string[],
  threshold: number,
): Promise<Map<string, FamilyTag>> {
  const ids = [...new Set(guardianIds)];
  if (ids.length === 0) return new Map(); // .in() with no ids is a PostgREST error
  const data = rows(
    await deps.db
      .from('students')
      .select('id, guardian_id, subscriptions(id, status)')
      .in('guardian_id', ids),
  );
  const balances = await deps.balances.forStudents(data.map((s) => s.id));
  return familyTags(data, balances, threshold);
}
