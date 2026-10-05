import type { PostgrestError } from '@supabase/supabase-js';
import { orSafe } from '../modules/guardians/http';
import { dbError } from '../modules/teachers/http';
import type { Db } from './db/db.module';

/** A name/code search matches at most this many students (their ids then go in the list's URL). */
export const STUDENT_MATCH_LIMIT = 200;

/**
 * A list's «الطالب» text filter where the table has no FK to students (lesson_feedback,
 * lesson_reports reference lesson_students): the ids of students whose name or code contains the
 * term. null = no usable term (no filter); [] = nobody matches (the caller answers an empty page).
 */
export async function studentIdsMatching(db: Db, term: string): Promise<string[] | null> {
  const safe = orSafe(term);
  if (!safe) return null;
  const res: { data: { id: string }[] | null; error: PostgrestError | null } = await db
    .from('students')
    .select('id')
    .or(`name.ilike.*${safe}*,code.ilike.*${safe}*`)
    .limit(STUDENT_MATCH_LIMIT);
  if (res.error) throw dbError(res.error);
  return (res.data ?? []).map((r) => r.id);
}
