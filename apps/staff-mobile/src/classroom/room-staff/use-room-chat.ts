import type { TeacherChannelRow } from '@ab/shared';
import { router } from 'expo-router';
import type { RoomChat } from '@ab/mobile-kit/room';
import { useHolds } from '@ab/mobile-kit';
import { useTeacherChannels } from '@/student-file';

type StaffAudience = 'teacher' | 'admin';

/** The staff app's channel sheet over the room (app/room-chat/[studentId].tsx). */
const roomChatRoute = (studentId: string, audience: StaffAudience): string =>
  `/room-chat/${encodeURIComponent(studentId)}?audience=${audience}`;

/** The teacher writes in her student's channel; an admin with the monitor reads it. */
function useAudience(): StaffAudience | null {
  const teacher = useHolds('self.teacher');
  const monitor = useHolds('student_channels.monitor');
  if (teacher) return 'teacher';
  return monitor ? 'admin' : null;
}

/** The teacher's unread count in this student's channel (0 when the list has no row). */
const unreadOf = (rows: readonly TeacherChannelRow[], studentId: string): number =>
  rows.find((r) => r.student_id === studentId)?.unread ?? 0;

/**
 * The in-room «المحادثة» of the staff app (owner 2026-11-16, canvas RoomXTeacherChat): THE student
 * channel (never a LiveKit chat), as a sheet over the live room, with the teacher's unread count.
 * None without the lesson's student, or for a role that has no channel view; hidden on a trial.
 */
export function useRoomChat(studentId: string | null): RoomChat | null {
  const audience = useAudience();
  const rows = useTeacherChannels(audience === 'teacher' && studentId !== null).data ?? [];
  if (!studentId || !audience) return null;
  return {
    unread: unreadOf(rows, studentId),
    open: () => router.push(roomChatRoute(studentId, audience)),
    whenLocked: 'hide',
  };
}
