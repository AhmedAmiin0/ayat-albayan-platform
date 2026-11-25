import type { PostgrestError } from '@supabase/supabase-js';
import { orSafe } from '@/modules/people/guardians/http';
import { pgError } from '@/common/db/errors';
import type { Db } from './db/db.module';

/** A name/code search matches at most this many students (their ids then go in the list's URL). */
export const STUDENT_MATCH_LIMIT = 200;

/** null means no usable term (no filter); [] means nobody matches (an empty page). */
export async function studentIdsMatching(db: Db, term: string): Promise<string[] | null> {
  const safe = orSafe(term);
  if (!safe) return null;
  const res: { data: { id: string }[] | null; error: PostgrestError | null } = await db
    .from('students')
    .select('id')
    .or(`name.ilike.*${safe}*,code.ilike.*${safe}*`)
    .limit(STUDENT_MATCH_LIMIT);
  if (res.error) throw pgError(res.error);
  return (res.data ?? []).map((r) => r.id);
}
