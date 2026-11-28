import { ACCOUNT_CODE_TEMPLATE } from '@ab/shared';
import type { ThreadQuotes, ReplyFields, SendFrom } from '@/modules/messaging/inbox/threads/thread-quotes';
import type { ThreadRow } from '@/modules/messaging/inbox/threads/threads.mapper';
import { httpError } from '@/common/http/errors';
import type { ThreadSend } from './thread-send.types';

const senderOf = <T>(s: ThreadSend<T>): string => {
  if (s.sales) return `sales:${s.sales.salesId}`;
  return s.scope ? `teacher:${s.scope.teacherId}` : 'admin';
};

/**
 * Rule 8: every inbox send carries the client's request id, so a retried POST (lost answer, double
 * tap) returns the first row instead of messaging the family twice. 400 without one. The key is
 * scoped to who sends and to whom (`teacher:<teacher>:<phone>:<id>`, `admin:<phone>:<id>`), so one
 * id reused on another phone, or by another teacher, is a new send, never the first family's row.
 */
export function dedupKey<T>(s: ThreadSend<T>): string {
  if (!s.input.clientRequestId) throw httpError(400, 'missing_client_request_id');
  return `${senderOf(s)}:${s.phone}:${s.input.clientRequestId}`;
}

const peopleOf = (thread: ThreadRow | null) => ({
  lead_id: thread?.lead_id ?? null,
  guardian_id: thread?.guardian_id ?? null,
});

/** People resolved by phone, like v_threads. */
export function outboundBase<T>(s: ThreadSend<T>, thread: ThreadRow | null) {
  return {
    phone_e164: s.phone,
    ...peopleOf(thread),
    created_by: s.actorId,
    sent_by_teacher_id: s.scope?.teacherId ?? null,
    ...(s.forwardedFrom ? { forwarded_from_id: s.forwardedFrom } : {}),
  };
}

/** Resolved in this chat only (ThreadQuotes.target); none is {}. */
export async function replyOf(
  quotes: ThreadQuotes | undefined,
  s: ThreadSend<{ replyToMessageId?: string | undefined }>,
  from: SendFrom,
): Promise<ReplyFields | Record<string, never>> {
  if (!s.input.replyToMessageId) return {};
  if (!quotes) throw new Error('ThreadQuotes is not provided');
  return quotes.target(s.phone, s.input.replyToMessageId, from);
}

/** Templates another part of the API sends itself: a hand send is refused (status, code). */
const NOT_BY_HAND = new Map<string, [number, string]>([
  // Its link is signed per lesson and student by FeedbackModule; a hand-made one is dead.
  ['lesson_feedback_request', [400, 'use_feedback_request']],
  // ClassroomModule mints the one-lesson token.
  ['lesson_join_link', [400, 'use_join_link']],
  // The rating send picks the lesson and its date itself (rule 6) and sets the payloads.
  ['lesson_rating', [400, 'use_rating_button']],
  // The sign-in code (docs/30) is only ever sent by the API itself, never typed by hand.
  [ACCOUNT_CODE_TEMPLATE, [403, 'template_not_allowed']],
]);

export function assertSentByHand(key: string): void {
  const refusal = NOT_BY_HAND.get(key);
  if (refusal) throw httpError(...refusal);
}
