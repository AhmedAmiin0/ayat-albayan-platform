import type { Database } from '@ab/db';
import type { PostgrestError } from '@supabase/supabase-js';
import type { Db } from '@/common/db/db.module';
import { pgError, raisedAs, type PgErrorMap } from '@/common/db/errors';
import { conflict } from '@/common/http/errors';

interface RpcResult {
  data: unknown;
  error: PostgrestError | null;
}
type RpcName = keyof Database['public']['Functions'];
interface UntypedRpc {
  rpc(fn: string, args: Record<string, unknown>): PromiseLike<RpcResult>;
}

const slotTaken = () => conflict('slot_taken');

/**
 * The lesson RPCs' `raise exception '<code>'` messages are 409s. A generated row's (rule_id,
 * starts_at | local_date) key (migration 110) means that slot is taken; moved rows never hold a
 * slot, so other unique keys stay plain DB errors.
 */
export const LESSON_RPC_ERRORS: PgErrorMap = {
  raised: raisedAs(
    [
      'invalid_transition',
      'rule_not_active',
      'stale_time',
      'course_changed',
      'course_unattributed',
      'teacher_clash',
    ],
    conflict,
  ),
  constraints: { lessons_rule_starts_uidx: slotTaken, lessons_rule_date_uidx: slotTaken },
};

/** Postgres error from the lesson RPCs → HTTP. */
export const rpcError = (error: PostgrestError): Error => pgError(error, LESSON_RPC_ERRORS);

/**
 * Calls a lesson RPC (migrations 080 / 100) by its generated name. Args stay loose on purpose:
 * the generated types make every arg non-null and jsonb-typed, but p_actor may be null (the
 * daily job) and the change sets are typed objects, not `Json`.
 */
export async function callRpc(
  db: Db,
  fn: RpcName,
  args: Record<string, unknown>,
): Promise<unknown> {
  const { data, error } = await (db as unknown as UntypedRpc).rpc(fn, args);
  if (error) throw rpcError(error);
  return data;
}
