import { NotFoundException } from '@nestjs/common';
import type { Json } from '@ab/db';
import type { PostgrestError } from '@supabase/supabase-js';
import type { Db } from '../../../../common/db/db.module';
import { conflict } from '../../../../common/http/errors';
import { rpcError } from '../../../teaching/scheduling/rpc';
import type { SubmitPayload } from './submit-plan';

/** `raise exception '<code>'` in submit_report (migration 130) → 409 domain errors. */
const CONFLICTS = new Set(['version_conflict', 'lesson_cancelled', 'invalid_transition']);

/** submit_report's Postgres error → HTTP; the rest as the lesson RPCs map them. */
export function submitError(error: PostgrestError): Error {
  if (error.code === 'P0001' && CONFLICTS.has(error.message)) return conflict(error.message);
  if (error.code === 'P0001' && error.message === 'report_not_found') return new NotFoundException();
  return rpcError(error);
}

/** Calls public.submit_report (one transaction: report + version + audit + lesson outcome). */
export async function callSubmitReport(db: Db, payload: SubmitPayload): Promise<void> {
  // SubmitPayload is plain JSON (strings, numbers, nulls, arrays); TS cannot see an interface as Json.
  const { error } = await db.rpc('submit_report', { p: payload as unknown as Json });
  if (error) throw submitError(error);
}
