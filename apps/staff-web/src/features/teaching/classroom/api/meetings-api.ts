import { instantLessonCall, lessonRoomCalls, studentLinkCalls } from '@ab/client-core';
import type { RoomJoinResult } from '@ab/schedule';
import { apiFetch, apiSend, publicApiFetch, publicApiSend } from '@ab/web-kit';

const rooms = lessonRoomCalls({ apiFetch, apiSend });
const studentDoor = studentLinkCalls({ apiFetch: publicApiFetch, apiSend: publicApiSend });

/** Admin or the lesson's teacher. */
export const openRoom = (lessonId: string) => rooms.openRoom(lessonId);

/** Admin only: 409 conflict unless override.reason. */
export const startInstant = instantLessonCall({ apiFetch, apiSend });

/** Admin only: creates or rotates the link. */
export const issueStudentLink = (studentId: string) => rooms.issueStudentLink(studentId);

/** The student's current or next lesson (no staff session token). */
export const studentLinkView = (token: string) => studentDoor.view(token);

const studentPath = (token: string): string => `/public/student/${encodeURIComponent(token)}`;

/** POST /public/student/:token/join: the guest join of the lesson whose room is open now. */
export const joinByStudentLink = ({ token, name }: { token: string; name?: string }) =>
  publicApiSend<RoomJoinResult>('POST', `${studentPath(token)}/join`, name ? { name } : {});
