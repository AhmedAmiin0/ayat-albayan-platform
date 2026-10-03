import type { Database } from '@ab/db';
import type { PostgrestError } from '@supabase/supabase-js';
import type { Db } from '../../common/db/db.module';
import { dbError } from '../teachers/http';
import { conflict } from './errors';

type RpcResult = { data: unknown; error: PostgrestError | null };
type RpcName = keyof Database['public']['Functions'];
type UntypedRpc = { rpc(fn: string, args: Record<string, unknown>): PromiseLike<RpcResult> };

/** `raise exception '<code>'` messages in migrations 080 / 100 / 174 that map to a 409 domain error. */
const RAISED_CODES = new Set(['invalid_transition', 'rule_not_active', 'stale_time']);

/** Postgres error from the lesson RPCs → HTTP. */
export function rpcError(error: PostgrestError): Error {
  if (error.code === 'P0001' && RAISED_CODES.has(error.message)) return conflict(error.message);
  // A generated row's (rule_id, starts_at | local_date) key (migration 110): that slot is taken.
  // Moved rows never hold a slot, so other unique keys stay plain DB errors.
  if (error.code === '23505' && error.message.includes('lessons_rule_')) return conflict('slot_taken');
  return dbError(error);
}

/**
 * Calls a lesson RPC (migrations 080 / 100) by its generated name. Args stay loose on purpose:
 * the generated types make every arg non-null and jsonb-typed, but p_actor may be null (the
 * daily job) and the change sets are typed objects, not `Json`.
 */
export async function callRpc(db: Db, fn: RpcName, args: Record<string, unknown>): Promise<unknown> {
  const { data, error } = await (db as unknown as UntypedRpc).rpc(fn, args);
  if (error) throw rpcError(error);
  return data;
}
