import type { MuteSource } from '@ab/shared';
import { apiSend } from '@ab/web-kit/lib/http/api';
import { participantsBase } from '@ab/web-kit/classroom/share/share-api';

/** «كتم الميكروفون» / «إيقاف الكاميرا» for one participant: 204, or an ApiError. */
export type MuteCall = (input: { identity: string; source: MuteSource }) => Promise<void>;

/** POST {participants}/:identity/mute {source} for this room; null for a room of neither kind. */
export function muteFor(room: string): MuteCall | null {
  const base = participantsBase(room);
  if (base === null) return null;
  return ({ identity, source }) => apiSend('POST', `${base}/${encodeURIComponent(identity)}/mute`, { source });
}
