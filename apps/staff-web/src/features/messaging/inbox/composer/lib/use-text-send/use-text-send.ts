import {
  provisionalMessage,
  replayedOther,
  SEND_REPLAYED,
  SEND_UNCONFIRMED,
  type SentText,
  type TextAnswer,
} from '@ab/client-core';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { BUNDLES, t, locale } from '@ab/web-kit';
import { errorCode } from '@/features/teaching/schedule';
import { sendText } from '@/features/messaging/inbox/api/api';
import {
  dropSending,
  holdSending,
  rereadSentChat,
  showSending,
  showSent,
} from '@/features/messaging/inbox/api/send-cache';
import { type Draft, getDraft, requestIdFor, setDraft } from '@/features/messaging/inbox/composer/lib/draft-store';
import { recordOwnSend } from '@/features/messaging/inbox/composer/lib/own-send';
import { sendErrorCode } from '@/features/messaging/inbox/composer/lib/send-error';

export interface Sent {
  phone: string;
  text: string;
  clientRequestId: string;
  replyTo?: string | undefined;
  correctsId?: string | undefined;
  /** The edit tap it was sent from: its success ends that edit only. */
  editSession?: string | undefined;
  gen: { draft: number; own: number };
  after?: (() => void) | undefined;
}

interface SendHooks {
  replyDone: (id: string) => void;
  editDone?: ((session: string) => void) | undefined;
  settled: () => void;
}

/** The API adds the correction prefix to a corrected message itself. */
const linksOf = ({ replyTo, correctsId }: Sent) => ({
  ...(replyTo ? { replyToMessageId: replyTo } : {}),
  ...(correctsId ? { correctsId } : {}),
});

/** A sent answer or correction clears its strip (only while it is still the one picked). */
function clearPicks(sent: Sent, hooks: SendHooks): void {
  if (sent.replyTo) hooks.replyDone(sent.replyTo);
  if (sent.editSession) hooks.editDone?.(sent.editSession);
}

/** The box's send of `text` with its id (requestIdFor: the pinned or kept one first). */
export const textSentOf = (phone: string, draft: Draft, text: string) => ({
  phone,
  text,
  clientRequestId: requestIdFor(draft, text),
});

/** What settleTextSend reads of the answer. */
type Answer = Pick<TextAnswer, 'body' | 'corrects_id' | 'replayed' | 'same_request'>;

/**
 * The Arabic prefixes the API may put before a correction (the box's «nothing left» check only):
 * the admins' wording (this run's `t`, when it is the Arabic one), then the bundled default.
 */
export const correctionPrefixes = (): string[] => [
  ...(locale === 'ar' ? [t.inbox.correction.prefix] : []),
  BUNDLES.ar.inbox.correction.prefix,
];

/** What the answer is checked against: the text, and a correction's original (the API says
 * whether a replayed first row is this very correction: `same_request`). */
const sentText = ({ text, correctsId }: Sent): SentText => ({
  text,
  correction: correctsId ? { id: correctsId } : undefined,
});

/** docs/44 M1: checked on every 2xx; a 409 session_closed is decided before the dedup lookup. */
export function settleTextSend(view: Answer, sent: Sent): boolean {
  const now = getDraft(sent.phone);
  const lost = replayedOther(view, sentText(sent));
  const note = { text: sent.text, id: crypto.randomUUID(), code: SEND_REPLAYED };
  const next = lost ? { text: now.text || sent.text, failed: note } : { ...now, failed: null };
  setDraft(sent.phone, next, sent.gen.draft);
  return lost;
}

/**
 * The text composer's send (H3), optimistic like mobile (docs/44 BUG3, K3): the text shows at once
 * as a queued row whose id is the clientRequestId, the API's row replaces it, then the open chat
 * reads its newest page only. The text goes back in the box with its key unless she has typed a
 * new one since. A refusal (4xx) takes the row out; no answer (deadline, network, 5xx) keeps it as
 * «unconfirmed» and its id pins the box (draft-store) until a send with it is answered (BUG7).
 */
export function useTextSend(phone: string, hooks: SendHooks) {
  const client = useQueryClient();
  return useMutation({
    mutationKey: ['inbox-send', phone],
    mutationFn: (sent: Sent) => {
      const { phone: to, text, clientRequestId } = sent;
      return sendText({ phone: to, text, clientRequestId, ...linksOf(sent) });
    },
    onMutate: async (sent) => {
      // Her own send snaps the log to the bottom (own-send), the provisional row first.
      recordOwnSend(sent.phone, sent.clientRequestId, sent.gen.own);
      const id = sent.clientRequestId;
      await showSending(client, provisionalMessage({ id, phone: sent.phone, body: sent.text }));
    },
    onSuccess: (view, sent) => {
      recordOwnSend(sent.phone, view.id, sent.gen.own);
      showSent(client, sent.clientRequestId, view);
      // A replay brings the text back and keeps the reply or edit target picked.
      const replayed = settleTextSend(view, sent);
      if (!replayed) clearPicks(sent, hooks);
      sent.after?.();
    },
    onError: async (e, sent) => {
      const code = sendErrorCode(e);
      const keep = code === SEND_UNCONFIRMED ? holdSending : dropSending;
      keep(client, sent.phone, sent.clientRequestId);
      const now = getDraft(sent.phone);
      const failed = { text: sent.text, id: sent.clientRequestId, code };
      setDraft(sent.phone, { text: now.text || sent.text, failed }, sent.gen.draft);
      // The window may have closed since the page loaded: refetch so the composer switches.
      if (errorCode(e) === 'session_closed') await rereadSentChat(client, sent.phone);
    },
    onSettled: hooks.settled,
  });
}
