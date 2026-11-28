import { baseMime, isChatViewMime, STICKER_SIZE } from '@ab/shared';
import { ApiError } from '@ab/mobile-kit';

/** Why a bubble's file cannot be shown (W6): what the bubble says instead of the file. */
export type MediaProblem = 'expired' | 'forbidden' | 'crm' | 'failed';

/**
 * 410: imported history or a purged voice note; 403: a role that may not open files;
 * 409 crm_no_media: the CRM holds it (docs/19).
 */
export function mediaProblem(e: unknown): MediaProblem {
  if (!(e instanceof ApiError)) return 'failed';
  if (e.status === 410) return 'expired';
  if (e.status === 403) return 'forbidden';
  const code = typeof e.body === 'object' && e.body !== null ? Reflect.get(e.body, 'code') : undefined;
  if (e.status === 409 && code === 'crm_no_media') return 'crm';
  return 'failed';
}

/** The box a photo previews in: fixed, so the inverted list never jumps when it loads. */
export interface PhotoBox {
  size: number;
  resizeMode: 'cover' | 'contain';
  border: boolean;
  /** No download under a sticker, as WhatsApp. */
  download: boolean;
}

const PHOTO: PhotoBox = { size: 220, resizeMode: 'cover', border: true, download: true };
const STICKER: PhotoBox = { size: STICKER_SIZE, resizeMode: 'contain', border: false, download: false };

/** HEIC is excluded since Android does not decode it reliably; stickers are smaller and uncut. */
export function photoBox(mime: string | null): PhotoBox | null {
  const base = baseMime(mime);
  if (!isChatViewMime(mime) || !base.startsWith('image/') || base === 'image/heic') return null;
  return base === 'image/webp' ? STICKER : PHOTO;
}
