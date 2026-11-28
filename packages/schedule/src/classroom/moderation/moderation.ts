import type { JoinRole } from '../room';

/**
 * The JSON in every LiveKit token's `metadata` (participant.metadata in the room): the role, so
 * each client knows who may remove whom and labels the teacher. Never a user id or a link id: those
 * stay on the server (classroom_participants), keyed by the identity.
 */
export interface ParticipantMeta {
  role: JoinRole;
}

export const participantMeta = (role: JoinRole): string =>
  JSON.stringify({ role } satisfies ParticipantMeta);

/** The role in a participant's metadata, or null when absent or malformed. */
export function roleOfMeta(metadata: string | undefined | null): JoinRole | null {
  try {
    const role = (JSON.parse(metadata ?? '') as Partial<ParticipantMeta>).role;
    return typeof role === 'string' ? role : null;
  } catch {
    return null;
  }
}

/** Admin removes anyone but an admin; the teacher removes guests, assistants and sales. */
export function canRemove(actor: JoinRole, target: JoinRole): boolean {
  if (actor === 'admin') return target !== 'admin';
  if (actor === 'teacher') return target === 'guest' || target === 'assistant' || target === 'sales';
  return false;
}

const SHARE_GRANTORS: ReadonlySet<JoinRole> = new Set<JoinRole>(['teacher', 'admin', 'assistant']);

/** A guest's token allows camera and mic only; staff above may grant screen share. */
export function canGrantShare(actor: JoinRole | null, target: JoinRole | null): boolean {
  return actor !== null && SHARE_GRANTORS.has(actor) && target === 'guest';
}

/** Seniority in the room: a staff member mutes only someone below them. */
const RANK: Readonly<Record<JoinRole, number>> = {
  admin: 4,
  teacher: 3,
  assistant: 2,
  sales: 1,
  guest: 0,
};

/** Mutes lower ranks only (admin > teacher > assistant > sales > guest). */
export function canMute(actor: JoinRole | null, target: JoinRole | null): boolean {
  if (actor === null || target === null || !SHARE_GRANTORS.has(actor)) return false;
  return RANK[actor] > RANK[target];
}

/** Muting every guest is the teacher's or an admin's. */
export const canMuteAll = (actor: JoinRole | null): boolean => actor === 'teacher' || actor === 'admin';

/** GET /recordings/status: false = RECORDING_S3_* or LiveKit missing, rooms are not recorded. */
export interface RecordingStatus {
  configured: boolean;
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

/** Ending the lesson for everyone is the lesson's teacher's or an admin's. */
export const canEndLesson = (actor: JoinRole | null): boolean => actor === 'teacher' || actor === 'admin';
