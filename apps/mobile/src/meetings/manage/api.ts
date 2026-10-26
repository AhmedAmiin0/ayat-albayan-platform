import type { MeetingCreated, MeetingView, RoomJoinResult } from '@ab/shared';
import { useQuery } from '@tanstack/react-query';
import { Linking } from 'react-native';
import { apiFetch, apiSend } from '@/core/lib/http/api';
import { pathKey } from '@/core/lib/query/query-keys';
import { meetingUrl } from './meeting-text';

/** GET /meetings: all for an admin, else the caller's own and the ones they are invited to. Key ['meetings'] reaches every call below. */
export const useMeetings = () =>
  useQuery({ queryKey: [...pathKey('/meetings'), 'list'], queryFn: () => apiFetch<MeetingView[]>('/meetings') });

/** POST /meetings/:id/end (creator or admin): 204. */
export const endMeeting = (id: string) => apiSend('POST', `/meetings/${id}/end`);

/** POST /meetings/:id/link (creator or admin): a fresh link; the previous one stops working. */
export const newMeetingLink = (id: string) => apiSend<MeetingCreated>('POST', `/meetings/${id}/link`);

/** POST /meetings/:id/join asks the API first (refusals read in the app), then the web room opens in the system browser. */
export async function enterMeeting(id: string): Promise<void> {
  await apiSend<RoomJoinResult>('POST', `/meetings/${id}/join`);
  await Linking.openURL(meetingUrl(id));
}
