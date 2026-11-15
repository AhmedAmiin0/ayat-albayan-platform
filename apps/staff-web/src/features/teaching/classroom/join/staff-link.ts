import type { UserRole } from '@ab/shared';
import { apiFetch } from '@/lib/http/api';

const STAFF: ReadonlySet<UserRole> = new Set<UserRole>(['admin', 'teacher', 'assistant', 'sales']);

/** A signed-in staff login (never a guardian, never signed out). */
export const isStaffRole = (role: UserRole | null | undefined): boolean => role !== null && role !== undefined && STAFF.has(role);

/** /m/<token> opened by staff → their own room /meeting/<id> (GET /meetings/by-link/:token). */
export const meetingPathOfLink = async (token: string): Promise<string> => {
  const { id } = await apiFetch<{ id: string }>(`/meetings/by-link/${encodeURIComponent(token)}`);
  return `/meeting/${id}`;
};

/** /join/<token> opened by the lesson's staff → /classroom/<lesson> (GET /join-links/:token/lesson). */
export const lessonPathOfLink = async (token: string): Promise<string> => {
  const { lessonId } = await apiFetch<{ lessonId: string }>(`/join-links/${encodeURIComponent(token)}/lesson`);
  return `/classroom/${lessonId}`;
};
