import { baseMime } from '@ab/shared';
import { HttpStatus } from '@nestjs/common';
import { waHttpError } from '../../templates/catalog/template.mapper';

/** The old CRM's storage gets this long for the whole file (headers and body). */
export const CRM_FETCH_TIMEOUT_MS = 10_000;
/** The storage did not answer about the file (down, timed out, 5xx, 429): try again later, it is not gone. */
export const CRM_UNREACHABLE = 'crm_unreachable';

type CrmFetchInput = { url: URL; mime: string; maxBytes: number };

const gone = (): Error => waHttpError('media_expired', HttpStatus.GONE);
const tooBig = (): Error => waHttpError('invoice_too_large', HttpStatus.PAYLOAD_TOO_LARGE);
const unreachable = (): Error => waHttpError(CRM_UNREACHABLE, HttpStatus.BAD_GATEWAY);
/** A busy or broken server, not an answer about this file. */
const transient = (status: number): boolean => status >= 500 || status === 429;

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
 * is refused), 10 s in all, the body streamed and cut at `maxBytes`. 200 only, with a content type
 * of the row's family. Unreachable (no answer, the timeout, a broken stream), 5xx or 429 → 502 crm_unreachable
 * (CRM_UNREACHABLE: a retry may work); any other status, another type or an empty body → 410 media_expired;
 * larger than the cap → 413 invoice_too_large.
 */
export async function fetchCrmMedia(input: CrmFetchInput): Promise<Uint8Array> {
  const signal = AbortSignal.timeout(CRM_FETCH_TIMEOUT_MS);
  const res = await fetch(input.url.href, { redirect: 'manual', signal }).catch(() => {
    throw unreachable();
  });
  if (transient(res.status)) {
    await res.body?.cancel().catch(() => undefined);
    throw unreachable();
  }
  if (res.status !== 200 || !res.body || !sameFamily(res.headers.get('content-type'), input.mime)) {
    await res.body?.cancel().catch(() => undefined);
    throw gone();
  }
  if (Number(res.headers.get('content-length') ?? 0) > input.maxBytes) {
    await res.body.cancel().catch(() => undefined);
    throw tooBig();
  }
  return readCapped(res.body, input.maxBytes);
}

/** The stream's bytes, cancelled (413) the moment they pass `max`; a broken (or timed-out) stream is 502. */
async function readCapped(body: ReadableStream<Uint8Array>, max: number): Promise<Uint8Array> {
  const reader = body.getReader();
  const chunks: Uint8Array[] = [];
  let total = 0;
  for (;;) {
    const next = await reader.read().catch(() => {
      throw unreachable();
    });
    if (next.done) break;
    total += next.value.byteLength;
    if (total > max) {
      await reader.cancel().catch(() => undefined);
      throw tooBig();
    }
    chunks.push(next.value);
  }
  if (total === 0) throw gone();
  const out = new Uint8Array(total);
  let at = 0;
  for (const c of chunks) {
    out.set(c, at);
    at += c.byteLength;
  }
  return out;
}
