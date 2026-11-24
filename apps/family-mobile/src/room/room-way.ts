import type { PortalWayIn } from '@ab/shared';
import { z } from 'zod';

// Classroom opens in-app while family_meetings_in_app is on and the binary has LiveKit.

export type JoinWay = 'room' | 'link';

/** Only our classroom has an in-app room; a Meet lesson or none never does. */
const HAS_ROOM: Readonly<Record<PortalWayIn, boolean>> = {
  classroom: true,
  external: false,
  none: false,
};

/** `inApp`: the setting is on and LiveKit is in this binary (useRoomsInApp). */
export const joinWay = (wayIn: PortalWayIn, inApp: boolean): JoinWay =>
  HAS_ROOM[wayIn] && inApp ? 'room' : 'link';

export interface RoomLink {
  studentId: string;
  lessonId: string;
  /** From the lesson-started push: straight in with the microphone on. */
  direct?: boolean;
}

const enc = encodeURIComponent;

/** app/room/[id]: the lesson's room, full screen over the app. */
export function roomHref({ studentId, lessonId, direct = false }: RoomLink): string {
  const query = new URLSearchParams({ student: studentId, ...(direct && { direct: '1' }) });
  return `/room/${enc(lessonId)}?${query.toString()}`;
}

/** app/room-chat/[id]: the student channel as a sheet over the live room. */
export const roomChatHref = (studentId: string): string => `/room-chat/${enc(studentId)}`;

const roomParams = z.object({
  id: z.uuid(),
  student: z.uuid(),
  direct: z.literal('1').optional(),
});

/** The route's params, checked (rule 12); null for a bad or stale link. */
export function parseRoomParams(params: unknown): Required<RoomLink> | null {
  const parsed = roomParams.safeParse(params);
  if (!parsed.success) return null;
  const { id, student, direct } = parsed.data;
  return { lessonId: id, studentId: student, direct: direct === '1' };
}
