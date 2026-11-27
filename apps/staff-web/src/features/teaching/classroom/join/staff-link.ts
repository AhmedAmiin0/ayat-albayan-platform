import type { UserRole } from '@ab/catalog';
import { lessonJoinCalls, meetingCalls } from '@ab/client-core';
import { apiFetch, apiSend } from '@ab/web-kit';

const meetings = meetingCalls({ apiFetch, apiSend });
const joins = lessonJoinCalls({ apiFetch, apiSend });

const STAFF: ReadonlySet<UserRole> = new Set<UserRole>(['admin', 'teacher', 'assistant', 'sales']);

/** A signed-in staff login (never a guardian, never signed out). */
export const isStaffRole = (role: UserRole | null | undefined): boolean =>
  role !== null && role !== undefined && STAFF.has(role);

/** /m/<token> opened by staff → their own room /meeting/<id> (GET /meetings/by-link/:token). */
export const meetingPathOfLink = async (token: string): Promise<string> => {
  const { id } = await meetings.byLink(token);
  return `/meeting/${id}`;
};

/** /join/<token> opened by the lesson's staff → /classroom/<lesson> (GET /join-links/:token/lesson). */
export const lessonPathOfLink = async (token: string): Promise<string> => {
  const { lessonId } = await joins.staffLessonOf(token);
  return `/classroom/${lessonId}`;
};
