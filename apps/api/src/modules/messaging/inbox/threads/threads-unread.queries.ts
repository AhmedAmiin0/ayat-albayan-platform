import type { Db } from '../../../../common/db/db.module';
import { phoneList } from '../../numbers';
import type { ThreadListFilter } from './threads.list';

/**
 * The unread badge (web nav, sales tab title, mobile tab: GET /threads?unread=true&pageSize=1, `total`
 * only): no list, status or search filter. Those read v_threads in full; this is the same number.
 */
export function isUnreadBadge(f: ThreadListFilter): boolean {
  return f.unread === true && f.pageSize === 1 && !f.list && !f.status && !f.search;
}

/**
 * Threads with an inbound row no admin opened (thread_summaries.unread_count > 0, the partial index of
 * migration 20261028000921), within `phones` when given (teacher mode's scope) and never the academy's
 * own numbers (`hide`), as the list. One row per phone, as v_threads, whose leads / guardians / teachers
 * joins are one-to-one (unique phones): the same count.
 */
export async function unreadThreadCount(db: Db, f: Pick<ThreadListFilter, 'phones' | 'hide'> = {}): Promise<number> {
  let query = db.from('thread_summaries').select('phone_e164', { count: 'exact', head: true }).gt('unread_count', 0);
  if (f.phones) query = query.in('phone_e164', [...f.phones]);
  if (f.hide?.length) query = query.not('phone_e164', 'in', phoneList(f.hide));
  const { count, error } = await query;
  if (error) throw new Error(`unread threads count failed: ${error.message}`);
  return count ?? 0;
}
