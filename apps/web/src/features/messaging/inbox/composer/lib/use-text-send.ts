import { provisionalMessage, replayedOther, SEND_REPLAYED, SEND_UNCONFIRMED } from '@ab/client-core';
import type { MessageView } from '@ab/shared';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { errorCode } from '@/features/teaching/schedule';
import { sendText } from '@/features/messaging/inbox/api/api';
import { dropSending, holdSending, showSending, showSent } from '@/features/messaging/inbox/api/send-cache';
import { type Draft, getDraft, requestIdFor, setDraft } from './draft-store';
import { recordOwnSend } from './own-send';
import { sendErrorCode } from './send-error';

/**
 * A send, the message it answers («رد»), the tab-memory generations it started in and what
 * follows it (never sent).
 */
export interface Sent {
  phone: string;
  text: string;
  clientRequestId: string;
  replyTo?: string | undefined;
  gen: { draft: number; own: number };
  after?: (() => void) | undefined;
}

/** What the box does around a send: «رد» cleared after it, the focus back after either outcome. */
interface SendHooks {
  replyDone: (id: string) => void;
  settled: () => void;
}

/** The box's send of `text` with its id (requestIdFor: the pinned or kept one first). */
export const textSentOf = (phone: string, draft: Draft, text: string) => ({
  phone,
  text,
  clientRequestId: requestIdFor(draft, text),
});

/**
 * A text got its 2xx (useMutation's own onSuccess: it runs after the box unmounted too): the
 * pinned id is released. An answer with another body is the FIRST message replayed under this id
 * (docs/44 M1): the edit comes back with the note and a fresh id. Checked on EVERY 2xx: a 409
 * session_closed is decided before the server's dedup lookup, so a released id may still replay.
 */
export function settleTextSend(view: Pick<MessageView, 'body'>, sent: Sent): void {
  const now = getDraft(sent.phone);
  const lost = replayedOther(view, sent.text);
  const note = { text: sent.text, id: crypto.randomUUID(), code: SEND_REPLAYED };
  const next = lost ? { text: now.text || sent.text, failed: note } : { ...now, failed: null };
  setDraft(sent.phone, next, sent.gen.draft);
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
    mutationFn: ({ phone: to, text, clientRequestId, replyTo }: Sent) => {
      const reply = replyTo ? { replyToMessageId: replyTo } : {};
      return sendText({ phone: to, text, clientRequestId, ...reply });
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
      if (sent.replyTo) hooks.replyDone(sent.replyTo);
      settleTextSend(view, sent);
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
      if (errorCode(e) === 'session_closed') await client.invalidateQueries({ queryKey: ['threads'] });
    },
    onSettled: hooks.settled,
  });
}
