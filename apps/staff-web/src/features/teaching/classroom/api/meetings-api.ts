import type {
  InstantLessonRequest,
  InstantLessonResult,
  RoomJoinResult,
  RoomOpenResult,
  StudentJoinLinkUrl,
  StudentLinkView,
} from '@ab/schedule';
import { apiSend, publicApiFetch, publicApiSend } from '@ab/web-kit';

/** Admin or the lesson's teacher. */
export const openRoom = (lessonId: string) => apiSend<RoomOpenResult>('POST', `/lessons/${lessonId}/room/open`);

/** Admin only: 409 conflict unless override.reason. */
export const startInstant = (body: InstantLessonRequest) => apiSend<InstantLessonResult>('POST', '/lessons/instant', body);

/** Admin only: creates or rotates the link. */
export const issueStudentLink = (studentId: string) => apiSend<StudentJoinLinkUrl>('POST', `/students/${studentId}/join-link`);

const studentPath = (token: string): string => `/public/student/${encodeURIComponent(token)}`;

/** GET /public/student/:token: the student's current or next lesson (no staff session token). */
export const studentLinkView = (token: string) =>
  publicApiFetch<StudentLinkView>(studentPath(token));

/** POST /public/student/:token/join: the guest join of the lesson whose room is open now. */
export const joinByStudentLink = ({ token, name }: { token: string; name?: string }) =>
  publicApiSend<RoomJoinResult>('POST', `${studentPath(token)}/join`, name ? { name } : {});
