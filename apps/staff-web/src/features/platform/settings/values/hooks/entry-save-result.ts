import type { ConfigEntryConflict } from '@ab/shared';
import { ApiError } from '@/lib/http/api';
import { serverMessage } from './save-result';

// How «القيم» reads a refused PATCH /config/entries/:key (docs/26 §2f): 409 conflict (someone saved
// first), 409 owned_by_module (a module page edits it), 428 (the typed confirmation is missing or
// wrong), 422 / 404 / anything else (a failed save with the server's words).

export type RowStatus =
  | { state: 'idle' }
  | { state: 'saving' }
  | { state: 'failed'; message?: string | undefined }
  | { state: 'moved' }
  | { state: 'conflict'; conflict: ConfigEntryConflict; mine: unknown };

/** saved; moved (owned); failed; conflict (the row waits for a choice); confirm (ask for the typed text). */
export type SaveEnd = 'saved' | 'moved' | 'failed' | 'conflict' | 'confirm';

export const IDLE: RowStatus = { state: 'idle' };

const codeOf = (body: unknown): unknown =>
  body !== null && typeof body === 'object' ? (body as Record<string, unknown>).code : undefined;

/** Is this a 409 `conflict` body with the newer facts? */
export function isConflict(body: unknown): body is ConfigEntryConflict {
  if (codeOf(body) !== 'conflict') return false;
  const b = body as Record<string, unknown>;
  return typeof b.version === 'number' && 'current' in b;
}

export interface FailureInput {
  /** The value this save sent (the conflict row shows it as «قيمتك»). */
  mine: unknown;
  /** Was a typed confirmation sent? A 428 then means it did not match. */
  typed: boolean;
}

/** The row's status and the save's end for a refused save. */
export function saveFailure(error: unknown, input: FailureInput): { status: RowStatus; end: SaveEnd } {
  const failed = { status: { state: 'failed', message: serverMessage(error) } as RowStatus, end: 'failed' as const };
  if (!(error instanceof ApiError)) return failed;
  const code = codeOf(error.body);
  if (error.status === 409 && isConflict(error.body)) {
    return { status: { state: 'conflict', conflict: error.body, mine: input.mine }, end: 'conflict' };
  }
  if (error.status === 409 && code === 'owned_by_module') return { status: { state: 'moved' }, end: 'moved' };
  if (error.status === 428 && !input.typed) return { status: IDLE, end: 'confirm' };
  return failed;
}
