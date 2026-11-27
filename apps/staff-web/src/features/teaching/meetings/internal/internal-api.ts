import { meetingCalls, publicMeetingCalls } from '@ab/client-core';
import { queryOptions } from '@tanstack/react-query';
import { apiFetch, apiSend, publicApiFetch, publicApiSend } from '@ab/web-kit';
import { meetingKeys } from './meeting.keys';

const meetings = meetingCalls({ apiFetch, apiSend });
const guestDoor = publicMeetingCalls({ apiFetch: publicApiFetch, apiSend: publicApiSend });

// A standalone room with no lesson.

export const MEETINGS_KEY = meetingKeys.all;

/** GET /meetings: the newest (all for an admin, else the ones I created or am invited to). POST: meeting-invites-api. */
export const meetingsQuery = queryOptions({
  queryKey: meetingKeys.list(),
  queryFn: () => meetings.list(),
});

/** POST /meetings/:id/end (creator or admin): 204. */
export const endMeeting = (id: string) => meetings.end(id);

/** POST /meetings/:id/link (creator or admin): a fresh link; the previous one stops working. */
export const newMeetingLink = (id: string) => meetings.newLink(id);

/** POST /meetings/:id/join: staff, with their own login. A fresh identity per call. */
export const joinMeeting = (id: string) => meetings.join(id);

export { removeMeetingParticipant } from '@ab/web-kit';

/** GET /public/meetings/:token, polled so the page notices when the meeting ends. */
export const publicMeetingQuery = (token: string) =>
  queryOptions({
    queryKey: meetingKeys.public(token),
    queryFn: () => guestDoor.view(token),
    retry: false,
    refetchInterval: 30_000,
  });

/** POST /public/meetings/:token/join {name}: a guest token. */
export const joinMeetingAsGuest = (input: { linkToken: string; name: string }) =>
  guestDoor.join(input);

/** Copies to the clipboard; false when the browser refuses (the URL stays on screen to copy by hand). */
export async function copyText(text: string): Promise<boolean> {
  try {
    await navigator.clipboard.writeText(text);
    return true;
  } catch {
    return false;
  }
}
