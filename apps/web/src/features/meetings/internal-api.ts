import type { MeetingCreated, MeetingView, PublicMeetingView, RoomJoinResult } from '@ab/shared';
import { queryOptions } from '@tanstack/react-query';
import { ApiError, apiFetch, apiSend } from '@/lib/http/api';
import { env } from '@/lib/http/env';

// «اجتماع داخلي»: a standalone room with no lesson (POST /meetings and friends, /public/meetings/:token).

export const MEETINGS_KEY = ['internal-meetings'] as const;

/** GET /meetings: the newest (all for an admin, else the ones I created or am invited to). POST: meeting-invites-api. */
export const meetingsQuery = queryOptions({
  queryKey: [...MEETINGS_KEY, 'list'],
  queryFn: () => apiFetch<MeetingView[]>('/meetings'),
});

/** POST /meetings/:id/end (creator or admin): 204. */
export const endMeeting = (id: string) => apiSend('POST', `/meetings/${id}/end`);

/** POST /meetings/:id/link (creator or admin): a fresh link; the previous one stops working. */
export const newMeetingLink = (id: string) => apiSend<MeetingCreated>('POST', `/meetings/${id}/link`);

/** POST /meetings/:id/join: staff, with their own login. A fresh identity per call. */
export const joinMeeting = (id: string) => apiSend<RoomJoinResult>('POST', `/meetings/${id}/join`);

/** POST /meetings/:id/participants/:identity/remove: disconnects someone (no lasting block). */
export const removeMeetingParticipant = ({ meetingId, identity }: { meetingId: string; identity: string }) =>
  apiSend('POST', `/meetings/${meetingId}/participants/${encodeURIComponent(identity)}/remove`);

function parseJson(text: string): unknown {
  try {
    return text ? JSON.parse(text) : null;
  } catch {
    return null;
  }
}

/** Plain fetch for the public routes: never the staff session token. */
async function publicCall<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(`${env.apiUrl}${path}`, init);
  const body = parseJson(await res.text());
  if (!res.ok) throw new ApiError(res.status, body);
  return body as T;
}

/** GET /public/meetings/:token, polled so the page notices when the meeting ends. */
export const publicMeetingQuery = (token: string) =>
  queryOptions({
    queryKey: [...MEETINGS_KEY, 'public', token],
    queryFn: () => publicCall<PublicMeetingView>(`/public/meetings/${encodeURIComponent(token)}`),
    retry: false,
    refetchInterval: 30_000,
  });

/** POST /public/meetings/:token/join {name}: a guest token. */
export const joinMeetingAsGuest = ({ linkToken, name }: { linkToken: string; name: string }) =>
  publicCall<RoomJoinResult>(`/public/meetings/${encodeURIComponent(linkToken)}/join`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ name }),
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
