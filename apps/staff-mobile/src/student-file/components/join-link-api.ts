import { lessonRoomCalls } from '@ab/client-core';
import { apiFetch, apiSend } from '@ab/mobile-kit';

const rooms = lessonRoomCalls({ apiFetch, apiSend });

/** Admin: the student's new link; it rotates the old one, so the card confirms first. */
export const issueJoinLink = (studentId: string) => rooms.issueStudentLink(studentId);
