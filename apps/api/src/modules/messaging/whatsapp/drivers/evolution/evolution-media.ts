import { HttpStatus } from '@nestjs/common';
import type { z } from 'zod';
import { WaError } from '@/modules/messaging/whatsapp/whatsapp.types';
import { evolutionHttp, evolutionPath, type EvolutionConn } from './evolution-http';
import { MEDIA_BASE64_MAX, mediaSchema } from './evolution-shapes';
import { httpError } from '@/common/http/errors';

// Inbound media on an Evolution number (docs/19 «Evolution driver»): the webhook stores only the
// message id; the bytes come from Evolution's own store the first time a file is opened, then live
// in the wa-media bucket like every other driver's (inbound-media.service.ts). The answer is one
// JSON with the file as base64, read through the capped byte read: the API runs a 384 MB heap, so
// an answer is never held past the base64 of the largest chat file (the 16 MB PLAYABLE_MAX_BYTES).

const DEFAULT_MIME = 'application/octet-stream';
const MEDIA_TIMEOUT_MS = 60_000;
const JSON_SLACK = 1024 * 1024;

/** The largest answer read: base64 of the 16 MB chat cap plus room for the JSON around it. */
export const MEDIA_ANSWER_MAX = MEDIA_BASE64_MAX + JSON_SLACK;

/** A Cloud instance needs the whole Meta message to download: not available from an id alone. */
const cloudMedia = (): WaError =>
  new WaError('inbound media is not supported on an Evolution Cloud API instance', {
    code: null, status: 0, unsupported: 'evolution',
  });

/** Final for this file: InboundMedia keeps it on the row and never asks again. */
const tooLarge = (): Error => httpError(HttpStatus.PAYLOAD_TOO_LARGE, 'invoice_too_large');

const malformed = (): WaError =>
  new WaError('Unexpected Evolution response', { code: null, status: 200 });

/** Not JSON reads as null, which the schema refuses like any other shape. */
const jsonOf = (body: Uint8Array<ArrayBuffer>): Promise<unknown> =>
  new Response(body).json().catch(() => null);

async function parsed(body: Uint8Array<ArrayBuffer>): Promise<z.output<typeof mediaSchema>> {
  const media = mediaSchema.safeParse(await jsonOf(body));
  if (!media.success) throw malformed();
  return media.data;
}

export async function evolutionMedia(
  conn: EvolutionConn,
  messageId: string,
): Promise<{ bytes: Uint8Array; mime: string }> {
  if (conn.env.mode === 'cloud') throw cloudMedia();
  const answer = await evolutionHttp(conn).bytes({
    path: evolutionPath(conn.env, 'chat/getBase64FromMediaMessage'),
    method: 'POST',
    json: { message: { key: { id: messageId } }, convertToMp4: false },
    timeoutMs: MEDIA_TIMEOUT_MS,
    maxBytes: MEDIA_ANSWER_MAX,
    tooLarge,
  });
  const media = await parsed(answer.bytes);
  return { bytes: Buffer.from(media.base64, 'base64'), mime: media.mimetype ?? DEFAULT_MIME };
}
