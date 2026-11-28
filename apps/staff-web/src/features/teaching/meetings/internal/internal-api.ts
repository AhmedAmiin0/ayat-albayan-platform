import type { MeetingCreated, MeetingView, PublicMeetingView, RoomJoinResult } from '@ab/schedule';
import { queryOptions } from '@tanstack/react-query';
import { apiFetch, apiSend, publicApiFetch, publicApiSend } from '@ab/web-kit';
import { meetingKeys } from './meeting.keys';

// A standalone room with no lesson.

export const MEETINGS_KEY = meetingKeys.all;

/** GET /meetings: the newest (all for an admin, else the ones I created or am invited to). POST: meeting-invites-api. */
export const meetingsQuery = queryOptions({
  queryKey: meetingKeys.list(),
  queryFn: () => apiFetch<MeetingView[]>('/meetings'),
});

/** POST /meetings/:id/end (creator or admin): 204. */
export const endMeeting = (id: string) => apiSend('POST', `/meetings/${id}/end`);

/** POST /meetings/:id/link (creator or admin): a fresh link; the previous one stops working. */
export const newMeetingLink = (id: string) =>
  apiSend<MeetingCreated>('POST', `/meetings/${id}/link`);

/** POST /meetings/:id/join: staff, with their own login. A fresh identity per call. */
export const joinMeeting = (id: string) => apiSend<RoomJoinResult>('POST', `/meetings/${id}/join`);

export { removeMeetingParticipant } from '@ab/web-kit';

/** GET /public/meetings/:token, polled so the page notices when the meeting ends. */
export const publicMeetingQuery = (token: string) =>
  queryOptions({
    queryKey: meetingKeys.public(token),
    queryFn: () =>
      publicApiFetch<PublicMeetingView>(`/public/meetings/${encodeURIComponent(token)}`),
    retry: false,
    refetchInterval: 30_000,
  });

/** POST /public/meetings/:token/join {name}: a guest token. */
export const joinMeetingAsGuest = ({ linkToken, name }: { linkToken: string; name: string }) =>
  publicApiSend<RoomJoinResult>('POST', `/public/meetings/${encodeURIComponent(linkToken)}/join`, {
    name,
  });

/** Copies to the clipboard; false when the browser refuses (the URL stays on screen to copy by hand). */
export async function copyText(text: string): Promise<boolean> {
  try {
    await navigator.clipboard.writeText(text);
    return true;
  } catch {
    return false;
  }
}
