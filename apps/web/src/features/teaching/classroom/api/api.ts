import {
  addCalendarDays,
  localDateIn,
  wallToUtc,
  type AssistantLessonView,
  type AssistantView,
  type JoinLinkResult,
  type JoinLinkUrl,
  type LessonView,
  type RoomJoinResult,
} from '@ab/shared';
import { queryOptions } from '@tanstack/react-query';
import { ApiError, apiFetch, apiSend } from '@/lib/http/api';
import { env } from '@/lib/http/env';
import { viewerZone } from '@/lib/clock-text';

export const CLASSROOM_KEY = ['classroom'] as const;

/** POST /lessons/:id/room/join: staff, with their own login. A fresh identity per call. */
export const joinRoom = (lessonId: string) => apiSend<RoomJoinResult>('POST', `/lessons/${lessonId}/room/join`);

function parseBody(text: string): unknown {
  try {
    return text ? JSON.parse(text) : null;
  } catch {
    return null;
  }
}

/** POST /public/join/:linkToken: the guest's name, no login (plain fetch: never the staff session token). */
export async function joinAsGuest({ linkToken, name }: { linkToken: string; name: string }): Promise<RoomJoinResult> {
  const res = await fetch(`${env.apiUrl}/public/join/${encodeURIComponent(linkToken)}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ name }),
  });
  const text = await res.text();
  const body = parseBody(text);
  if (!res.ok) throw new ApiError(res.status, body);
  return body as RoomJoinResult;
}

/** POST /lessons/:id/join-link (admin): the family's one-lesson link, by WhatsApp. */
export const sendJoinLink = ({ lessonId, studentId }: { lessonId: string; studentId: string }) =>
  apiSend<JoinLinkResult>('POST', `/lessons/${lessonId}/join-link`, { studentId });

/** POST /lessons/:id/join-link/url (admin or the lesson's teacher): the guest URL to copy. */
export const copyJoinLinkUrl = (lessonId: string) => apiSend<JoinLinkUrl>('POST', `/lessons/${lessonId}/join-link/url`);

/** GET /assistants (admin): every assistant login. */
export const assistantsQuery = queryOptions({
  queryKey: [...CLASSROOM_KEY, 'assistants'],
  queryFn: () => apiFetch<AssistantView[]>('/assistants'),
});

/** GET /students/:id/assistants. */
export const studentAssistantsQuery = (studentId: string) =>
  queryOptions({
    queryKey: [...CLASSROOM_KEY, 'student', studentId],
    queryFn: () => apiFetch<AssistantView[]>(`/students/${studentId}/assistants`),
  });

export const assignAssistant = ({ studentId, profileId }: { studentId: string; profileId: string }) =>
  apiSend<AssistantView[]>('POST', `/students/${studentId}/assistants`, { profileId });

export const removeAssistant = ({ studentId, profileId }: { studentId: string; profileId: string }) =>
  apiSend<AssistantView[]>('DELETE', `/students/${studentId}/assistants/${profileId}`);

/** The local day `date` in `tz` [00:00, next 00:00) as ISO instants (classroom-day.golden). */
function dayIn(date: string, tz: string): { from: string; to: string } {
  const to = wallToUtc(addCalendarDays(date, 1), 0, tz);
  return { from: wallToUtc(date, 0, tz).toISOString(), to: to.toISOString() };
}

/** The browser-local day [00:00, 24:00) as ISO instants. */
export function localDay(now: Date, tz = viewerZone()): { from: string; to: string } {
  return dayIn(localDateIn(now, tz), tz);
}

/** GET /assistants/me/lessons for the local day. */
export const assistantLessonsQuery = (day: { from: string; to: string }) =>
  queryOptions({
    queryKey: [...CLASSROOM_KEY, 'mine', day.from],
    queryFn: () => apiFetch<AssistantLessonView[]>(`/assistants/me/lessons?${new URLSearchParams(day)}`),
  });

/** The browser-local day `offset` days from `now`, as ISO instants. */
export function dayAround(
  now: Date,
  offset: number,
  tz = viewerZone(),
): { from: string; to: string } {
  return dayIn(addCalendarDays(localDateIn(now, tz), offset), tz);
}

/** GET /lessons?from&to (admin): every teacher's lessons of one local day. */
export const adminDayQuery = (day: { from: string; to: string }) =>
  queryOptions({
    queryKey: ['lessons', 'classrooms', day.from],
    queryFn: () => apiFetch<LessonView[]>(`/lessons?${new URLSearchParams(day)}`),
  });
