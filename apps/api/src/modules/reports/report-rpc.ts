import { NotFoundException } from '@nestjs/common';
import type { PostgrestError } from '@supabase/supabase-js';
import type { Db } from '../../common/db/db.module';
import { conflict } from '../scheduling/errors';
import { rpcError } from '../scheduling/rpc';
import type { SubmitPayload } from './submit-plan';

type RpcResult = { data: unknown; error: PostgrestError | null };
type UntypedRpc = { rpc(fn: string, args: Record<string, unknown>): PromiseLike<RpcResult> };

/** `raise exception '<code>'` in submit_report (migration 130) → 409 domain errors. */
const CONFLICTS = new Set(['version_conflict', 'lesson_cancelled', 'invalid_transition']);

/** submit_report's Postgres error → HTTP; the rest as the lesson RPCs map them. */
export function submitError(error: PostgrestError): Error {
  if (error.code === 'P0001' && CONFLICTS.has(error.message)) return conflict(error.message);
  if (error.code === 'P0001' && error.message === 'report_not_found') return new NotFoundException();
  return rpcError(error);
}

/**
 * Calls public.submit_report (one transaction: report + version + audit + lesson outcome).
 * TODO(types): submit_report is not in packages/db/src/types.ts until the types are regenerated
 * after merge, hence the untyped call (same cast as scheduling/rpc.ts).
 */
export async function callSubmitReport(db: Db, payload: SubmitPayload): Promise<void> {
  const { error } = await (db as unknown as UntypedRpc).rpc('submit_report', { p: payload });
  if (error) throw submitError(error);
}
