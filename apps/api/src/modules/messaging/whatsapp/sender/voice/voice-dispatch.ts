import { baseMime } from '@ab/shared';
import { Logger } from '@nestjs/common';
import { BUCKETS, isSentFilePath, voiceM4aPath } from '@/common/storage/storage.paths';
import type { StorageService } from '@/common/storage/storage.service';
import type { DueMessage } from '@/modules/messaging/whatsapp/sender/sender.due';
import {
  WaError, type VoiceUpload, type WaSent, type WhatsappClient,
} from '@/modules/messaging/whatsapp/whatsapp.types';

// A voice note recorded in the app, on a line that uploads media (capsOf().mediaUpload: meta,
// kapso; 2026-11-14): the ogg is uploaded and sent by its media id. A refused upload or send
// sends the recorded m4a once instead, by link as plain audio; the row records it (WaSent.media).

const log = new Logger('VoiceDispatch');

/** One voice note's send: the row and its ogg path, the line's client, the signed link maker. */
export interface VoiceAt {
  row: DueMessage;
  path: string;
  client: WhatsappClient;
  storage: StorageService;
  link: (path: string) => Promise<string>;
}

const M4A = { media_mime: 'audio/mp4', media_name: 'voice.m4a' } as const;

/** An ogg (the API's transcode of a recorded note, or a family's own forwarded one). */
export const isVoiceOgg = (row: DueMessage): boolean =>
  baseMime(row.media_mime ?? null) === 'audio/ogg';

/** Meta (or Kapso) answered with a refusal: nothing went out, so the m4a cannot double the note. */
export const refusedNow = (e: unknown): boolean =>
  e instanceof WaError && !e.info.uncertain && e.info.status >= 400 && e.info.status < 500;

/** The recorded m4a by link as plain audio (no voice flag); none kept → the ogg's own error. */
async function m4aInstead(at: VoiceAt, cause: unknown): Promise<WaSent> {
  const path = voiceM4aPath(at.path);
  if (!(await at.storage.exists({ bucket: BUCKETS.waMedia, path }))) throw cause;
  log.warn(`voice note refused as ogg, sent as m4a: ${at.path} (${String(cause)})`);
  const url = await at.link(path);
  const { row } = at;
  const input = { to: row.phone_e164, kind: 'audio', url, replyTo: row.reply_to_wa_id } as const;
  const sent = await at.client.sendDocument({ ...input, voice: false });
  return { ...sent, media: { media_path: path, ...M4A } };
}

/** The ogg's bytes from Storage, uploaded: the media id. Nobody is messaged yet. */
async function uploadOgg(at: VoiceAt, voice: VoiceUpload): Promise<string> {
  const sent = isSentFilePath(at.path);
  const ogg = sent ? await at.storage.download({ bucket: BUCKETS.waMedia, path: at.path }) : null;
  if (!ogg) throw new WaError(`the voice note ${at.path} is missing`, { code: 100, status: 0 });
  return voice.upload(ogg);
}

/** Sent by id; only a refusal falls back (a timeout may have delivered it: never twice). */
async function sendById(at: VoiceAt, sent: { voice: VoiceUpload; id: string }): Promise<WaSent> {
  const { row } = at;
  const input = { to: row.phone_e164, id: sent.id, replyTo: row.reply_to_wa_id };
  return sent.voice.send(input).catch(async (e: unknown) => {
    if (!refusedNow(e)) throw e;
    return m4aInstead(at, e);
  });
}

/** Upload, then send by id; any upload failure or a refused send → the m4a, once. */
export function sendVoiceById(at: VoiceAt, voice: VoiceUpload): Promise<WaSent> {
  return uploadOgg(at, voice).then(
    (id) => sendById(at, { voice, id }),
    (e: unknown) => m4aInstead(at, e),
  );
}
