import type {
  InstantLessonRequest,
  InstantLessonResult,
  RoomJoinResult,
  RoomOpenResult,
  StudentJoinLinkUrl,
  StudentLinkView,
} from '@ab/shared';
import { ApiError, apiSend } from '@/lib/api';
import { env } from '@/lib/env';

/** POST /lessons/:id/room/open «افتح الحلقة الآن» (admin or the lesson's teacher). */
export const openRoom = (lessonId: string) => apiSend<RoomOpenResult>('POST', `/lessons/${lessonId}/room/open`);

/** POST /lessons/instant «حلقة فورية» (admin): 409 conflict unless override.reason. */
export const startInstant = (body: InstantLessonRequest) => apiSend<InstantLessonResult>('POST', '/lessons/instant', body);

/** POST /students/:id/join-link «رابط دخول الطالب» (admin): creates or rotates the link. */
export const issueStudentLink = (studentId: string) => apiSend<StudentJoinLinkUrl>('POST', `/students/${studentId}/join-link`);

/** Plain fetch for the student's public page: never the staff session token. */
async function publicCall<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(`${env.apiUrl}${path}`, init);
  const text = await res.text();
  const body = parseBody(text);
  if (!res.ok) throw new ApiError(res.status, body);
  return body as T;
}

function parseBody(text: string): unknown {
  try {
    return text ? JSON.parse(text) : null;
  } catch {
    return null;
  }
}

/** GET /public/student/:token: the student's current or next lesson. */
export const studentLinkView = (token: string) => publicCall<StudentLinkView>(`/public/student/${encodeURIComponent(token)}`);

/** POST /public/student/:token/join: the guest join of the lesson whose room is open now. */
export const joinByStudentLink = ({ token, name }: { token: string; name?: string }) =>
  publicCall<RoomJoinResult>(`/public/student/${encodeURIComponent(token)}/join`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(name ? { name } : {}),
  });
