import { Logger } from '@nestjs/common';
import type { Bucket } from '../../../../common/storage/storage.paths';
import type { StorageService } from '../../../../common/storage/storage.service';
import { toVoiceOgg } from './voice-ogg';

/** What the outbox row carries for a file. */
interface SentMedia {
  media_path: string;
  media_mime: string;
  media_name: string;
}

type ObjectRef = { bucket: Bucket; path: string };

const log = new Logger('VoiceSend');

/** The ogg's fixed name beside the m4a: a replay overwrites the same object (upsert), never a second one. */
export const voiceOggPath = (m4aPath: string): string => `${m4aPath.slice(0, m4aPath.lastIndexOf('/'))}/voice.ogg`;

/**
 * A voice note recorded in the app (audio/mp4, owner 2026-10-27) as WhatsApp's own voice note: the
 * ogg/opus copy, stored beside the m4a in the same out/{actor}/{request}/ folder and sent instead.
 * The m4a stays: a replayed request checks it before the outbox returns the first row. ffmpeg
 * missing or failing → the m4a itself, sent as plain audio (the family still hears it).
 */
export async function voiceMedia(storage: StorageService, m4a: ObjectRef, transcode = toVoiceOgg): Promise<SentMedia> {
  const plain = { media_path: m4a.path, media_mime: 'audio/mp4', media_name: 'voice.m4a' };
  const bytes = await storage.download(m4a);
  const ogg = bytes ? await transcode(bytes) : null;
  if (!ogg) {
    log.warn(`voice note sent as plain audio (no ogg/opus copy): ${m4a.path}`);
    return plain;
  }
  const path = voiceOggPath(m4a.path);
  await storage.upload({ bucket: m4a.bucket, path, body: ogg, contentType: 'audio/ogg' });
  return { media_path: path, media_mime: 'audio/ogg', media_name: 'voice.ogg' };
}
