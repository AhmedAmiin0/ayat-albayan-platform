import { WaError } from '@/modules/messaging/whatsapp/whatsapp.types';
import { evolutionHttp, evolutionPath, type EvolutionConn } from './evolution-http';
import { mediaSchema } from './evolution-shapes';

// Inbound media on an Evolution number (docs/19 «Evolution driver»): the webhook stores only the
// message id; the bytes come from Evolution's own store the first time a file is opened, then live
// in the wa-media bucket like every other driver's (inbound-media.service.ts).

const DEFAULT_MIME = 'application/octet-stream';
/** Inbound files are capped like the Graph download (WhatsApp's own limit is 100 MB). */
const MAX_BYTES = 100 * 1024 * 1024;
/** base64 of a 100 MB file, plus the JSON around it. */
const MEDIA_TIMEOUT_MS = 60_000;

/** A Cloud instance needs the whole Meta message to download: not available from an id alone. */
const cloudMedia = (): WaError =>
  new WaError('inbound media is not supported on an Evolution Cloud API instance', {
    code: null, status: 0, unsupported: 'evolution',
  });

/** Status 0: not a 4xx answer (which the media route would read as «expired»). */
const tooLarge = (): WaError => new WaError('media too large', { code: null, status: 0 });

export async function evolutionMedia(
  conn: EvolutionConn,
  messageId: string,
): Promise<{ bytes: Uint8Array; mime: string }> {
  if (conn.env.mode === 'cloud') throw cloudMedia();
  const media = await evolutionHttp(conn).json({
    path: evolutionPath(conn.env, 'chat/getBase64FromMediaMessage'),
    method: 'POST',
    json: { message: { key: { id: messageId } }, convertToMp4: false },
    timeoutMs: MEDIA_TIMEOUT_MS,
    schema: mediaSchema,
  });
  const bytes = Buffer.from(media.base64, 'base64');
  if (bytes.byteLength > MAX_BYTES) throw tooLarge();
  return { bytes: new Uint8Array(bytes), mime: media.mimetype ?? DEFAULT_MIME };
}
