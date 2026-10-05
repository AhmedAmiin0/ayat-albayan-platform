import { apiSend } from '@/lib/api';
import { lessonIdOfRoom, meetingIdOfRoom } from '../moderation-api';

/** «سماح» (allow) / «إيقاف مشاركة» (stop) one guest's screen share: 204, or an ApiError. */
export type GrantShare = (input: { identity: string; allow: boolean }) => Promise<void>;

/**
 * The route for this room: POST /lessons/:id/room/participants/:identity/share or
 * /meetings/:id/participants/:identity/share; null for a room of neither kind.
 */
export function grantShareFor(room: string): GrantShare | null {
  const meetingId = meetingIdOfRoom(room);
  const lessonId = lessonIdOfRoom(room);
  const base = meetingId !== null ? `/meetings/${meetingId}/participants` : lessonId !== null ? `/lessons/${lessonId}/room/participants` : null;
  if (base === null) return null;
  return ({ identity, allow }) => apiSend('POST', `${base}/${encodeURIComponent(identity)}/share`, { allow });
}
