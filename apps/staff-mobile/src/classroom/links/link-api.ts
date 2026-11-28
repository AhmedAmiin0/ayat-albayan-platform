import type { JoinLinkResult, JoinLinkUrl } from '@ab/schedule';
import { ApiError, apiSend, t } from '@ab/mobile-kit';
import { joinError } from './join-text';

/** POST /lessons/:id/join-link (admin): the family's one-lesson link, sent on WhatsApp. */
export const sendJoinLink = ({ lessonId, studentId }: { lessonId: string; studentId: string }) =>
  apiSend<JoinLinkResult>('POST', `/lessons/${lessonId}/join-link`, { studentId });

/** POST …/join-link/url (admin or the lesson's teacher): a fresh guest URL, nothing sent. */
export const joinLinkUrl = (lessonId: string) => apiSend<JoinLinkUrl>('POST', `/lessons/${lessonId}/join-link/url`);

/** A refused send/copy: 409 template gate, 403, 404 and the 503 gate, by their `code`. */
export function linkError(error: unknown): string {
  const body = error instanceof ApiError ? error.body : null;
  const coded = typeof body === 'object' && body !== null && 'code' in body;
  if (error instanceof ApiError && error.status === 403 && !coded)
    return t.mobileClassroom.linkForbidden;
  return joinError(error);
}
