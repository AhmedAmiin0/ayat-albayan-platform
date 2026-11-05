import { evolutionJson, type EvolutionConn } from './evolution-http';
import { evolutionShapeError } from './evolution-errors';
import { mediaSchema } from './evolution-shapes';
import { WaError } from '@/modules/messaging/whatsapp/whatsapp.types';

// Inbound media on an Evolution number (docs/19 «Evolution driver»): the webhook stores only the
// message id; the bytes come from Evolution's own store the first time a file is opened, then live
// in the wa-media bucket like every other driver's (inbound-media.service.ts).

const DEFAULT_MIME = 'application/octet-stream';
/** Inbound files are capped like the Graph download (WhatsApp's own limit is 100 MB). */
const MAX_BYTES = 100 * 1024 * 1024;

/** Cloud instances need the whole Meta message to download: not available from an id alone. */
const cloudMedia = (): WaError =>
  new WaError('inbound media is not supported on an Evolution Cloud API instance', {
    code: null, status: 0, unsupported: 'evolution',
  });

export async function evolutionMedia(
  conn: EvolutionConn,
  messageId: string,
): Promise<{ bytes: Uint8Array; mime: string }> {
  if (conn.env.mode === 'cloud') throw cloudMedia();
  const body = { message: { key: { id: messageId } }, convertToMp4: false };
  const raw = await evolutionJson(conn, { path: 'chat/getBase64FromMediaMessage', method: 'POST', body });
  const media = mediaSchema.safeParse(raw);
  if (!media.success) throw evolutionShapeError('a media download', false);
  const bytes = Buffer.from(media.data.base64, 'base64');
  if (bytes.byteLength > MAX_BYTES) throw new WaError('media too large', { code: null, status: 413 });
  return { bytes: new Uint8Array(bytes), mime: media.data.mimetype ?? DEFAULT_MIME };
}
