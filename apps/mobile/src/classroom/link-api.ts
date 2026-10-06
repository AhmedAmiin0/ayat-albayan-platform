import type { JoinLinkResult, JoinLinkUrl } from '@ab/shared';
import { ApiError, apiSend } from '@/lib/api';
import { t } from '@/lib/i18n';
import { joinError } from './join-text';

/** POST /lessons/:id/join-link (admin): the family's one-lesson link, sent to the guardian on WhatsApp. */
export const sendJoinLink = ({ lessonId, studentId }: { lessonId: string; studentId: string }) =>
  apiSend<JoinLinkResult>('POST', `/lessons/${lessonId}/join-link`, { studentId });

/** POST /lessons/:id/join-link/url (admin or the lesson's teacher): a fresh guest URL, nothing is sent. */
export const joinLinkUrl = (lessonId: string) => apiSend<JoinLinkUrl>('POST', `/lessons/${lessonId}/join-link/url`);

/** The words for a refused send/copy: 409 template gate, 403, 404 and the 503 gate by their `code`. */
export function linkError(error: unknown): string {
  const body = error instanceof ApiError ? error.body : null;
  const coded = typeof body === 'object' && body !== null && 'code' in body;
  if (error instanceof ApiError && error.status === 403 && !coded) return t.mobileClassroom.linkForbidden;
  return joinError(error);
}
