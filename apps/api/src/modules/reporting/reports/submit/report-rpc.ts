import { NotFoundException } from '@nestjs/common';
import type { Json } from '@ab/db';
import type { PostgrestError } from '@supabase/supabase-js';
import type { Db } from '@/common/db/db.module';
import { pgError, raisedAs, type PgErrorMap } from '@/common/db/errors';
import { conflict } from '@/common/http/errors';
import { LESSON_RPC_ERRORS } from '@/modules/teaching/scheduling/rpc';
import type { SubmitPayload } from './submit-plan';

/** submit_report's raised codes (migration 130); the rest as the lesson RPCs map them. */
const SUBMIT_ERRORS: PgErrorMap = {
  ...LESSON_RPC_ERRORS,
  raised: {
    ...LESSON_RPC_ERRORS.raised,
    ...raisedAs(
      ['version_conflict', 'lesson_cancelled', 'invalid_transition', 'form_version_mismatch'],
      conflict,
    ),
    report_not_found: () => new NotFoundException(),
  },
};

/** submit_report's Postgres error → HTTP. */
export const submitError = (error: PostgrestError): Error => pgError(error, SUBMIT_ERRORS);

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
