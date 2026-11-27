import { meetingCalls } from '@ab/client-core';
import { useQuery } from '@tanstack/react-query';
import { openRoom } from '@/classroom';
import { apiFetch, apiSend, pathKey } from '@ab/mobile-kit';

const meetings = meetingCalls({ apiFetch, apiSend });

/** GET /meetings: all for an admin, else the caller's own and the ones they are invited to. Key ['meetings'] reaches every call below. */
export const useMeetings = () =>
  useQuery({ queryKey: [...pathKey('/meetings'), 'list'], queryFn: () => meetings.list() });

/** POST /meetings/:id/end (creator or admin): 204. */
export const endMeeting = (id: string) => meetings.end(id);

/** POST /meetings/:id/link (creator or admin): a fresh link; the previous one stops working. */
export const newMeetingLink = (id: string) => meetings.newLink(id);

/** POST /meetings/:id/join (a refusal reads in the app), then the room: openRoom, docs/35. */
export async function enterMeeting(id: string, inApp: boolean): Promise<void> {
  await openRoom({ kind: 'meeting', id }, inApp);
}
