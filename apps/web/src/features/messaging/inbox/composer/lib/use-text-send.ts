import { provisionalMessage } from '@ab/client-core';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { errorCode } from '@/features/teaching/schedule';
import { sendText } from '@/features/messaging/inbox/api/api';
import { dropSending, showSending, showSent } from '@/features/messaging/inbox/api/send-cache';
import { getDraft, setDraft } from './draft-store';
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

/**
 * The text composer's send (H3), optimistic like mobile (docs/44 BUG3, K3): the text shows at once
 * as a queued row whose id is the clientRequestId, the API's row replaces it, then the open chat
 * reads its newest page only. A refused send takes the row out and puts the text back in the box
 * with its key (rule 8: the same text again reuses it), unless she has typed a new one since.
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
      const now = getDraft(sent.phone);
      if (now.failed) setDraft(sent.phone, { ...now, failed: null }, sent.gen.draft);
      sent.after?.();
    },
    onError: async (e, sent) => {
      dropSending(client, sent.phone, sent.clientRequestId);
      const now = getDraft(sent.phone);
      const failed = { text: sent.text, id: sent.clientRequestId, code: sendErrorCode(e) };
      setDraft(sent.phone, { text: now.text || sent.text, failed }, sent.gen.draft);
      // The window may have closed since the page loaded: refetch so the composer switches.
      if (errorCode(e) === 'session_closed') await client.invalidateQueries({ queryKey: ['threads'] });
    },
    onSettled: hooks.settled,
  });
}
