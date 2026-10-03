import type { JoinRole } from './room.js';

/**
 * The JSON in every LiveKit token's `metadata` (participant.metadata in the room): the role, so each
 * client knows who may remove whom and labels the teacher. Never a user id or a link id: those stay
 * on the server (classroom_participants), keyed by the identity.
 */
export interface ParticipantMeta {
  role: JoinRole;
}

export const participantMeta = (role: JoinRole): string => JSON.stringify({ role } satisfies ParticipantMeta);

/** The role in a participant's metadata, or null when absent or malformed. */
export function roleOfMeta(metadata: string | undefined | null): JoinRole | null {
  try {
    const role = (JSON.parse(metadata ?? '') as Partial<ParticipantMeta>).role;
    return typeof role === 'string' ? (role as JoinRole) : null;
  } catch {
    return null;
  }
}

/**
 * «إخراج من الحلقة»: an admin may remove anyone but another admin; the lesson's teacher may remove
 * guests, assistants and salespeople. Nobody removes themselves this way (they leave), nobody else
 * removes anyone. The API checks the same rule (POST /lessons/:id/room/participants/:identity/remove).
 */
export function canRemove(actor: JoinRole, target: JoinRole): boolean {
  if (actor === 'admin') return target !== 'admin';
  if (actor === 'teacher') return target === 'guest' || target === 'assistant' || target === 'sales';
  return false;
}

/** A lesson's recording (LiveKit egress, room composite MP4 in Supabase Storage). */
export interface LessonRecordingView {
  id: string;
  status: 'recording' | 'done' | 'failed';
  started_at: string;
  ended_at: string | null;
  /** Signed download link (1 h) once the file exists; null while recording or on failure. */
  url: string | null;
}
