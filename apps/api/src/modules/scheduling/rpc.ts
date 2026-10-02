import type { PostgrestError } from '@supabase/supabase-js';
import type { Db } from '../../common/db/db.module';
import { dbError } from '../teachers/http';
import { conflict } from './errors';

type RpcResult = { data: unknown; error: PostgrestError | null };
type UntypedRpc = { rpc(fn: string, args: Record<string, unknown>): PromiseLike<RpcResult> };

/** `raise exception '<code>'` messages in migrations 080 / 100 that map to a 409 domain error. */
const RAISED_CODES = new Set(['invalid_transition', 'rule_not_active']);

/** Postgres error from the lesson RPCs → HTTP. */
export function rpcError(error: PostgrestError): Error {
  if (error.code === 'P0001' && RAISED_CODES.has(error.message)) return conflict(error.message);
  // The only unique key a lesson write can hit is (rule_id, starts_at): that slot is taken.
  if (error.code === '23505') return conflict('slot_taken');
  return dbError(error);
}

/**
 * Calls an RPC from migrations 080 / 100. They are not in packages/db/src/types.ts until the
 * integrator regenerates it, so the typed client would reject the name.
 * TODO(Phase 2 integration): regenerate types.ts and call `db.rpc` directly.
 */
export async function callRpc(db: Db, fn: string, args: Record<string, unknown>): Promise<unknown> {
  const { data, error } = await (db as unknown as UntypedRpc).rpc(fn, args);
  if (error) throw rpcError(error);
  return data;
}
