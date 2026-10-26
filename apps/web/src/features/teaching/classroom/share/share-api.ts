import { apiSend } from '@/lib/http/api';
import { lessonIdOfRoom, meetingIdOfRoom } from '../api/moderation-api';

/** «سماح» (allow) / «إيقاف مشاركة» (stop) one guest's screen share: 204, or an ApiError. */
export type GrantShare = (input: { identity: string; allow: boolean }) => Promise<void>;

/**
 * The participants route of this room: /lessons/:id/room/participants or
 * /meetings/:id/participants; null for a room of neither kind.
 */
export function participantsBase(room: string): string | null {
  const meetingId = meetingIdOfRoom(room);
  const lessonId = lessonIdOfRoom(room);
  if (meetingId !== null) return `/meetings/${meetingId}/participants`;
  return lessonId !== null ? `/lessons/${lessonId}/room/participants` : null;
}

/** POST {base}/:identity/share for this room; null for a room of neither kind. */
export function grantShareFor(room: string): GrantShare | null {
  const base = participantsBase(room);
  if (base === null) return null;
  return ({ identity, allow }) => apiSend('POST', `${base}/${encodeURIComponent(identity)}/share`, { allow });
}
