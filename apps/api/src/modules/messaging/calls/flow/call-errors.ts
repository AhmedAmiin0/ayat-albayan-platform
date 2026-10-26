import { HttpException, HttpStatus, Logger } from '@nestjs/common';
import { WaError } from '../../whatsapp/whatsapp.types';

/** A short code for wa_calls.error_code and the 502 body: Meta's code, «uncertain» or «error». Never a payload. */
export function callErrorCode(e: unknown): string {
  if (!(e instanceof WaError)) return 'error';
  if (e.info.credential === 'kapso') return 'kapso_auth';
  if (e.info.uncertain) return 'uncertain';
  return e.info.code === null ? `http_${e.info.status}` : `meta_${e.info.code}`;
}

/** 502 call_failed with the code (131042 = Meta billing, docs/28 §7 step 3). */
export const callFailed = (code: string) =>
  new HttpException({ code: 'call_failed', message: 'call_failed', reason: code }, HttpStatus.BAD_GATEWAY);

/** Logs a failed Kapso step by the call's own id and the code only (no phone, no SDP). */
export function logCallError(log: Logger, input: { what: string; callId: string; error: unknown }): string {
  const code = callErrorCode(input.error);
  log.warn(`call ${input.callId}: ${input.what} failed (${code})`);
  return code;
}
