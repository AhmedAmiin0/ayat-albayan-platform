import {
  assistantsApi,
  guestJoinCalls,
  lessonJoinCalls,
  type AssistantPick,
  type GuestJoinInput,
  type JoinLinkSend,
} from '@ab/client-core';
import type { LessonView } from '@ab/schedule';
import { addCalendarDays, localDateIn, wallToUtc } from '@ab/time';
import { queryOptions } from '@tanstack/react-query';
import { apiFetch, apiSend, publicApiFetch, publicApiSend } from '@ab/web-kit/lib/http/api';
import { viewerZone } from '@ab/web-kit/lib/clock-text';

export const CLASSROOM_KEY = ['classroom'] as const;

const assistants = assistantsApi({ apiFetch, apiSend });
const joins = lessonJoinCalls({ apiFetch, apiSend });
const guestDoor = guestJoinCalls({ apiFetch: publicApiFetch, apiSend: publicApiSend });

/** Staff, with their own login. A fresh identity per call. */
export const joinRoom = (lessonId: string) => joins.join(lessonId);

/**
 * POST /public/join/:linkToken: the guest's name, never the staff session token. No name for a
 * link that names its student (the family app's): the API takes the student's.
 */
export const joinAsGuest = (input: GuestJoinInput) => guestDoor.join(input);

/** Admin: the family's one-lesson link, by WhatsApp. */
export const sendJoinLink = (send: JoinLinkSend) => joins.sendLink(send);

/** Admin or the lesson's teacher: the guest URL to copy. */
export const copyJoinLinkUrl = (lessonId: string) => joins.linkUrl(lessonId);

/** GET /assistants (admin): every assistant login. */
export const assistantsQuery = queryOptions({
  queryKey: [...CLASSROOM_KEY, 'assistants'],
  queryFn: assistants.all,
});

/** GET /students/:id/assistants. */
export const studentAssistantsQuery = (studentId: string) =>
  queryOptions({
    queryKey: [...CLASSROOM_KEY, 'student', studentId],
    queryFn: () => assistants.forStudent(studentId),
  });

export const assignAssistant = (pick: AssistantPick) => assistants.assign(pick);

export const removeAssistant = (pick: AssistantPick) => assistants.remove(pick);

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
    queryFn: () => assistants.mine(day),
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
