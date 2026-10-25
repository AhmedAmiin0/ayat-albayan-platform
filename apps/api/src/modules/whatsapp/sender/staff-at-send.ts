import type { Db } from '../../../common/db/db.module';
import { isStaffAlert, staffTeacherId, type StaffAtSend } from '../../reminders/staff-reachable';

/**
 * A staff alert's teacher as on record right now (send-stale staffStale): by the teacher id in its
 * dedup_key, else by the number it goes to. undefined for every other row (guardians, families,
 * leads: unchanged). A failed read throws: the worker skips the row and retries it next pass.
 */
export async function staffAtSend(
  db: Db,
  row: { template_key: string | null; dedup_key: string | null; phone_e164: string },
): Promise<StaffAtSend[] | undefined> {
  if (!isStaffAlert(row.template_key)) return undefined;
  const id = staffTeacherId(row.dedup_key);
  const query = db.from('teachers').select('status, phone_e164, profile:profiles!teachers_profile_id_fkey(disabled_at)');
  const { data, error } = await (id ? query.eq('id', id) : query.eq('phone_e164', row.phone_e164));
  if (error) throw new Error(`staff alert teacher read failed: ${error.message}`);
  return data ?? [];
}
