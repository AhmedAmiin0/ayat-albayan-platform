import { targetOfRoom, type RoomTarget } from '@/modules/teaching/classroom/recordings/recording-target';

const MINUTE_MS = 60_000;

/** The audit reason of a meeting this job ended (owner 2026-10-30). */
export const AUTO_END_REASON = 'auto_max_duration';

/**
 * settings.meeting_max_minutes as the cutoff instant: anything open since before it is closed.
 * null = the job is off (0, empty, not a whole positive number).
 */
export function cutoffOf(minutes: number | null | undefined, now: Date): Date | null {
  if (typeof minutes !== 'number' || !Number.isInteger(minutes) || minutes <= 0) return null;
  return new Date(now.getTime() - minutes * MINUTE_MS);
}

/** Open longer than the limit: strictly before the cutoff (exactly at the limit stays open). */
export function openTooLong(openedAt: string | Date | null | undefined, cutoff: Date): boolean {
  if (openedAt === null || openedAt === undefined) return false;
  const at = typeof openedAt === 'string' ? Date.parse(openedAt) : openedAt.getTime();
  return Number.isFinite(at) && at < cutoff.getTime();
}

export interface MeetingTimes {
  created_at: string;
  starts_at: string | null;
  ends_at: string | null;
  cancelled_at: string | null;
}

/** A meeting's room is open from its start (scheduled) or its creation (instant). */
const meetingOpenedAt = (m: MeetingTimes): string => m.starts_at ?? m.created_at;

/** Not ended nor cancelled, and open longer than the limit. */
export function meetingOverdue(m: MeetingTimes, cutoff: Date): boolean {
  return !m.ends_at && !m.cancelled_at && openTooLong(meetingOpenedAt(m), cutoff);
}

/** One LiveKit room as ListRooms answers it. createdAt null: LiveKit did not say. */
export interface LiveRoom {
  name: string;
  createdAt: Date | null;
}

/** A room the platform owns (`lesson-<uuid>` / `meeting-<uuid>`) with its target. */
export interface OwnedRoom extends LiveRoom {
  target: RoomTarget;
}

const asNumber = (v: unknown): number | null => {
  const n = typeof v === 'string' ? Number(v) : v;
  return typeof n === 'number' && Number.isFinite(n) && n > 0 ? n : null;
};

/** creation_time_ms, else creation_time (seconds; protojson sends int64 as a string). */
function createdAtOf(room: Record<string, unknown>): Date | null {
  const ms = asNumber(room.creation_time_ms);
  if (ms !== null) return new Date(ms);
  const s = asNumber(room.creation_time);
  return s === null ? null : new Date(s * 1000);
}

/** The rooms of a ListRooms answer (anything malformed is left out). */
export function liveRooms(answer: Record<string, unknown>): LiveRoom[] {
  const rooms = Array.isArray(answer.rooms) ? (answer.rooms as unknown[]) : [];
  const out: LiveRoom[] = [];
  for (const r of rooms) {
    if (!r || typeof r !== 'object') continue;
    const room = r as Record<string, unknown>;
    if (typeof room.name === 'string') out.push({ name: room.name, createdAt: createdAtOf(room) });
  }
  return out;
}

/** Only the rooms the API named; a room it cannot attribute is never touched. */
export function ownedRooms(rooms: readonly LiveRoom[], skip: ReadonlySet<string>): OwnedRoom[] {
  const out: OwnedRoom[] = [];
  for (const room of rooms) {
    const target = targetOfRoom(room.name);
    if (target && !skip.has(room.name)) out.push({ ...room, target });
  }
  return out;
}

/**
 * Close an owned room created before the cutoff (the orphan sweep), or a lesson's room whose
 * lessons.room_opened_at is before it (`lessonsOpenedLong`).
 */
export function roomOverdue(
  room: OwnedRoom,
  ctx: { cutoff: Date; lessonsOpenedLong: ReadonlySet<string> },
): boolean {
  if (openTooLong(room.createdAt, ctx.cutoff)) return true;
  return room.target.kind === 'lesson' && ctx.lessonsOpenedLong.has(room.target.id);
}
