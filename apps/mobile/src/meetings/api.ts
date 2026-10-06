import type { MeetingCreated, MeetingView, RoomJoinResult } from '@ab/shared';
import { useQuery } from '@tanstack/react-query';
import { Linking } from 'react-native';
import { apiFetch, apiSend } from '@/lib/api';
import { pathKey } from '@/lib/query-keys';
import { meetingUrl } from './meeting-text';

/** GET /meetings: the newest 20 (all for an admin, else the caller's own). Key ['meetings'] reaches every call below. */
export const useMeetings = () =>
  useQuery({ queryKey: [...pathKey('/meetings'), 'list'], queryFn: () => apiFetch<MeetingView[]>('/meetings') });

/** POST /meetings: the title is optional; the link comes back once (only its hash is stored). */
export const createMeeting = (title: string) =>
  apiSend<MeetingCreated>('POST', '/meetings', title.trim() ? { title: title.trim() } : {});

/** POST /meetings/:id/end (creator or admin): 204. */
export const endMeeting = (id: string) => apiSend('POST', `/meetings/${id}/end`);

/** POST /meetings/:id/link (creator or admin): a fresh link; the previous one stops working. */
export const newMeetingLink = (id: string) => apiSend<MeetingCreated>('POST', `/meetings/${id}/link`);

/** POST /meetings/:id/join asks the API first (refusals read in the app), then the web room opens in the system browser. */
export async function enterMeeting(id: string): Promise<void> {
  await apiSend<RoomJoinResult>('POST', `/meetings/${id}/join`);
  await Linking.openURL(meetingUrl(id));
}
