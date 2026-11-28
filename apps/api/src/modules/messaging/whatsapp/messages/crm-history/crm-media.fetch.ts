import { baseMime } from '@ab/shared';
import { HttpStatus } from '@nestjs/common';
import { httpError } from '@/common/http/errors';
import type { ErrorTable } from '@/common/infra/http/errors';
import { createHttp } from '@/common/infra/http/http';

/** The old CRM's storage gets this long for the whole file (headers and body). */
export const CRM_FETCH_TIMEOUT_MS = 10_000;
/**
 * The storage did not answer about the file (down, timed out, 5xx, 429): try again later, it is not
 * gone.
 */
export const CRM_UNREACHABLE = 'crm_unreachable';

interface CrmFetchInput {
  url: URL;
  mime: string;
  maxBytes: number;
}

const gone = (): Error => httpError(HttpStatus.GONE, 'media_expired');
const tooBig = (): Error => httpError(HttpStatus.PAYLOAD_TOO_LARGE, 'invoice_too_large');
const unreachable = (): Error => httpError(HttpStatus.BAD_GATEWAY, CRM_UNREACHABLE);

/** A busy or broken server (or no answer) is not an answer about this file; any other status is. */
const CRM_MEDIA_ERRORS: ErrorTable<Error> = {
  '5xx': unreachable,
  429: unreachable,
  network: unreachable,
  timeout: unreachable,
  default: gone,
};

const crmMedia = createHttp({
  name: 'crm-media',
  base: () => '',
  headers: () => Promise.resolve({}),
  timeoutMs: CRM_FETCH_TIMEOUT_MS,
  redirect: 'manual',
  errorBody: 'omit',
  errors: CRM_MEDIA_ERRORS,
});

/** image/webp vs image/jpeg is the same family; a PDF (or anything else) must match exactly. */
export function sameFamily(got: string | null, want: string): boolean {
  const a = baseMime(got);
  const b = baseMime(want);
  const family = (m: string): string => m.split('/')[0] ?? '';
  if (!a || !b) return false;
  return ['image', 'audio', 'video'].includes(family(b)) ? family(a) === family(b) : a === b;
}

/**
 * GET one old-CRM file (the URL allowedCrmUrl returned, nothing else): no redirect followed (a 3xx
 * is refused), 10 s in all, the body streamed and cut at `maxBytes`. A 2xx only, with a content
 * type of the row's family. Unreachable (no answer, the timeout, a broken stream), 5xx or 429 → 502
 * crm_unreachable (CRM_UNREACHABLE: a retry may work); any other status, another type or an empty
 * body → 410 media_expired; larger than the cap → 413 invoice_too_large.
 */
export async function fetchCrmMedia(input: CrmFetchInput): Promise<Uint8Array> {
  const { bytes, mime } = await crmMedia.bytes({
    path: input.url.href,
    maxBytes: input.maxBytes,
    tooLarge: tooBig,
  });
  if (bytes.byteLength === 0 || !sameFamily(mime, input.mime)) throw gone();
  return bytes;
}
