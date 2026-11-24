import type {
  InstantLessonRequest,
  InstantLessonResult,
  RoomJoinResult,
  RoomOpenResult,
  StudentJoinLinkUrl,
  StudentLinkView,
} from '@ab/schedule';
import { ApiError, apiSend } from '@ab/web-kit/lib/http/api';
import { env } from '@ab/web-kit/lib/http/env';

/** Admin or the lesson's teacher. */
export const openRoom = (lessonId: string) => apiSend<RoomOpenResult>('POST', `/lessons/${lessonId}/room/open`);

/** Admin only: 409 conflict unless override.reason. */
export const startInstant = (body: InstantLessonRequest) => apiSend<InstantLessonResult>('POST', '/lessons/instant', body);

/** Admin only: creates or rotates the link. */
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
