import { lessonJoinCalls, type JoinLinkSend } from '@ab/client-core';
import { ApiError, apiFetch, apiSend, t } from '@ab/mobile-kit';
import { joinError } from './join-text';

const joins = lessonJoinCalls({ apiFetch, apiSend });

/** Admin: the family's one-lesson link, sent to the guardian on WhatsApp. */
export const sendJoinLink = (send: JoinLinkSend) => joins.sendLink(send);

/** Admin or the lesson's teacher: a fresh guest URL, nothing is sent. */
export const joinLinkUrl = (lessonId: string) => joins.linkUrl(lessonId);

/** The words for a refused send/copy: 409 template gate, 403, 404 and the 503 gate by their `code`. */
export function linkError(error: unknown): string {
  const body = error instanceof ApiError ? error.body : null;
  const coded = typeof body === 'object' && body !== null && 'code' in body;
  if (error instanceof ApiError && error.status === 403 && !coded)
    return t.mobileClassroom.linkForbidden;
  return joinError(error);
}
