import { NotFoundException } from '@nestjs/common';
import type { Json } from '@ab/db';
import type { PostgrestError } from '@supabase/supabase-js';
import type { Db } from '../../../../common/db/db.module';
import { conflict } from '../../../../common/http/errors';
import { rpcError } from '../../../teaching/scheduling/rpc';
import type { SubmitPayload } from './submit-plan';

/** `raise exception '<code>'` in submit_report (migration 130) → 409 domain errors. */
const CONFLICTS = new Set(['version_conflict', 'lesson_cancelled', 'invalid_transition', 'form_version_mismatch']);

/** submit_report's Postgres error → HTTP; the rest as the lesson RPCs map them. */
export function submitError(error: PostgrestError): Error {
  if (error.code === 'P0001' && CONFLICTS.has(error.message)) return conflict(error.message);
  if (error.code === 'P0001' && error.message === 'report_not_found') return new NotFoundException();
  return rpcError(error);
}

/**
 * Calls public.submit_report (one transaction: report + version + audit + lesson outcome); a v2
 * payload (with content) goes through submit_report_content, which stores the content first.
 */
export async function callSubmitReport(db: Db, payload: SubmitPayload): Promise<void> {
  const fn = payload.content === undefined ? 'submit_report' : 'submit_report_content';
  // SubmitPayload is plain JSON (strings, numbers, nulls, arrays); TS cannot see an interface as Json.
  const { error } = await db.rpc(fn, { p: payload as unknown as Json });
  if (error) throw submitError(error);
}
