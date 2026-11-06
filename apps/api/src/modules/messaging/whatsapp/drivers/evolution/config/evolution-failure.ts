import { WA_ERROR } from '@ab/shared';
import { HttpException } from '@nestjs/common';
import { z } from 'zod';
import { waHttpError } from '@/modules/messaging/whatsapp/templates/catalog/template.mapper';
import { WaError } from '@/modules/messaging/whatsapp/whatsapp.types';

// Evolution's failure for the admin, in words (502): the key refused (evolution_auth), a value
// Evolution refused (evolution_rejected, with its own message), else unreachable. `saved`: the
// options were saved first, so the answer says «saved but not pushed».

/** Evolution's 4xx «invalid parameter» (any 4xx it did not name otherwise). */
const rejected = (e: WaError): boolean =>
  e.info.code === WA_ERROR.invalidParameter && e.info.status >= 400 && e.info.status < 500;

const CODES: readonly { test: (e: WaError) => boolean; code: string }[] = [
  { test: (e) => e.info.credential === 'evolution', code: 'evolution_auth' },
  { test: rejected, code: 'evolution_rejected' },
  { test: () => true, code: 'evolution_unreachable' },
];

/** Evolution's own words for a refused value (never a header, URL or body we sent). */
const detailOf = (e: WaError, code: string): Record<string, string> =>
  (code === 'evolution_rejected' && e.info.details ? { detail: e.info.details } : {});

const savedFlag = (saved: boolean): Record<string, true> => (saved ? { saved: true } : {});
const bodySchema = z.record(z.string(), z.unknown());

/** An HttpException of ours (409 evolution_not_configured …) with the «saved» flag added. */
function savedHttp(e: HttpException): HttpException {
  const raw = e.getResponse();
  const fields = bodySchema.safeParse(raw).data ?? { message: raw };
  return new HttpException({ ...fields, saved: true }, e.getStatus());
}

function waFailure(e: WaError, saved: boolean): HttpException {
  const code = CODES.find((c) => c.test(e))?.code ?? 'evolution_unreachable';
  return waHttpError(code, 502, { ...detailOf(e, code), ...savedFlag(saved) });
}

export function evolutionFailure(e: unknown, saved = false): unknown {
  if (e instanceof WaError) return waFailure(e, saved);
  return saved && e instanceof HttpException ? savedHttp(e) : e;
}
