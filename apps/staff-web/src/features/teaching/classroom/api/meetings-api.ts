import {
  instantLessonCall,
  lessonRoomCalls,
  studentLinkCalls,
  type StudentLinkJoin,
} from '@ab/client-core';
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

/** The guest join of the lesson whose room is open now; no name = the student's first name. */
export const joinByStudentLink = (input: StudentLinkJoin) => studentDoor.join(input);
